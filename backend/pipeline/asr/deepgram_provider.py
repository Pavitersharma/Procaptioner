import logging
import json
import time
from pathlib import Path
from deepgram import DeepgramClient
from config import DEEPGRAM_API_KEY, DEEPGRAM_MODEL, DEEPGRAM_COST_PER_MINUTE
from .schemas import TranscriptionResult, TranscriptionSegment, WordSegment
from . import ASRProvider

logger = logging.getLogger(__name__)

# Languages where code-switching with English is extremely common.
# Only Hindi and closely related dialects get routed to language="multi",
# because Hinglish (Hindi+English) is the dominant code-switching scenario
# and Deepgram's multi mode handles it well.
# All other Indian languages are sent with their OWN language code so Deepgram
# recognizes them correctly instead of biasing toward Hindi.
HINDI_CODE_SWITCH_LANGUAGES = {
    "hi", "hinglish", "multi",
}

# All languages that Deepgram Nova-3 supports natively.
# When one of these is explicitly selected, we send it directly.
DEEPGRAM_SUPPORTED_LANGUAGES = {
    "en", "hi", "mr", "gu", "bn", "ta", "te", "kn", "ml", "pa",
    "ne", "ur", "es", "fr", "de", "it", "pt", "ru", "nl", "pl",
    "sv", "no", "da", "fi", "el", "cs", "ro", "hu", "tr", "uk",
    "bg", "hr", "sk", "sl", "lt", "lv", "et", "sr", "ca",
    "ja", "ko", "zh", "th", "vi", "id", "ms", "tl",
    "ar", "fa", "he", "sw", "am",
    "multi",
}


class DeepgramProvider(ASRProvider):
    def __init__(self):
        if not DEEPGRAM_API_KEY:
            raise ValueError("DEEPGRAM_API_KEY is not set in environment or config.")
        self.client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

    def unload(self):
        pass # Nothing to unload

    def transcribe(
        self,
        audio_path: Path,
        language: str | None = None,
        model_name: str | None = None,
        word_timestamps: bool = True,
        vad_filter: bool = True,
        initial_prompt: str | None = None,
        on_progress: callable = None,
        keyterms: list[str] | None = None,
    ) -> TranscriptionResult:
        
        target_model = model_name or DEEPGRAM_MODEL
        logger.info(f"Transcribing via Deepgram '{target_model}', requested language='{language}'...")
        
        with open(audio_path, "rb") as audio_file:
            buffer = audio_file.read()
        
        kwargs = {
            "model": target_model,
            "smart_format": True,
            "utterances": True,  # Crucial for segments
            "punctuate": True,
        }
        
        if not language or language == "auto":
            # ── Auto-detection mode ──
            # Use language="multi" instead of detect_language=True.
            # detect_language=True picks ONE language and ignores all other speech,
            # which causes it to miss Punjabi/Bengali/Tamil words when it misdetects
            # the language as English or Hindi.
            # language="multi" transcribes ALL speech in every language present and
            # tags each word with its detected language. Our _extract_detected_language
            # method then counts per-word language tags to determine the dominant
            # language accurately.
            kwargs["language"] = "multi"
            logger.info("Using language=multi (auto-detection via per-word counting)")
        elif language in HINDI_CODE_SWITCH_LANGUAGES:
            # ── Hindi code-switch mode ──
            # Hindi frequently mixes with English (Hinglish). Using multi mode
            # lets Deepgram handle both languages in the same utterance.
            kwargs["language"] = "multi"
            logger.info(f"Using language=multi for '{language}' (Hindi code-switching)")
        elif language in DEEPGRAM_SUPPORTED_LANGUAGES:
            # ── Specific language mode ──
            # Send the exact language code. Deepgram Nova-3 natively supports
            # Bengali, Punjabi, Tamil, Telugu, Kannada, Malayalam, Marathi, etc.
            # Do NOT route these through 'multi' — that biases toward Hindi.
            kwargs["language"] = language
            logger.info(f"Using language='{language}' (direct language mode)")
        else:
            # ── Unsupported/unknown language ──
            # Fall back to multi mode for best coverage.
            kwargs["language"] = "multi"
            logger.warning(
                f"Language '{language}' not in Deepgram supported list. "
                f"Falling back to language=multi."
            )
            
        if keyterms:
            kwargs["keywords"] = keyterms

        start_time = time.time()
        
        response = self.client.listen.v1.media.transcribe_file(request=buffer, **kwargs)
        
        elapsed_time = time.time() - start_time
        logger.info(f"Deepgram API request took {elapsed_time:.2f}s")
        
        # Parse the Pydantic response into a dict
        result_dict = response.model_dump()
        
        # Debug: log the top-level keys so we can verify structure
        logger.info(f"Deepgram response top-level keys: {list(result_dict.keys())}")
        
        metadata = result_dict.get("metadata", {})
        duration = metadata.get("duration", 0.0)
        
        results = result_dict.get("results", {})
        channels = results.get("channels", [])
        if not channels:
            raise RuntimeError("Deepgram returned no channels in response")
            
        channel = channels[0]
        alternatives = channel.get("alternatives", [])
        
        # ── Extract detected language from Deepgram response ──
        # Deepgram can return the detected language in multiple locations depending
        # on the SDK version and request mode. We check all of them.
        detected_language = self._extract_detected_language(
            channel, alternatives, metadata, language
        )
        language_probability = self._extract_language_confidence(
            channel, alternatives
        )
        
        logger.info(
            f"Detected language: '{detected_language}' "
            f"(confidence: {language_probability:.2f})"
        )
        
        # Extract ALL words from channel alternatives (this is the complete word list)
        all_words_from_channel = []
        if alternatives:
            alt = alternatives[0]
            raw_words = alt.get("words", [])
            logger.info(f"Deepgram channel alternatives: {len(raw_words)} words found")
            for w in raw_words:
                all_words_from_channel.append(WordSegment(
                    word=w.get("word", "").strip(),
                    start=w.get("start", 0.0),
                    end=w.get("end", 0.0),
                    probability=w.get("confidence", 1.0)
                ))
        
        # Use utterances for segment boundaries
        utterances = results.get("utterances", [])
        logger.info(f"Deepgram utterances: {len(utterances) if utterances else 0}")
        
        result_segments: list[TranscriptionSegment] = []
        
        if utterances:
            for idx, utt in enumerate(utterances):
                words = []
                for w in utt.get("words", []):
                    words.append(WordSegment(
                        word=w.get("word", "").strip(),
                        start=w.get("start", 0.0),
                        end=w.get("end", 0.0),
                        probability=w.get("confidence", 1.0)
                    ))
                    
                result_segments.append(TranscriptionSegment(
                    id=idx + 1,
                    start=utt.get("start", 0.0),
                    end=utt.get("end", 0.0),
                    text=utt.get("transcript", "").strip(),
                    words=words,
                ))
        else:
            # Fallback: if no utterances, create a single segment from channel words
            if all_words_from_channel and alternatives:
                full_text = alternatives[0].get("transcript", "")
                result_segments.append(TranscriptionSegment(
                    id=1,
                    start=all_words_from_channel[0].start if all_words_from_channel else 0.0,
                    end=all_words_from_channel[-1].end if all_words_from_channel else 0.0,
                    text=full_text.strip(),
                    words=all_words_from_channel,
                ))
        
        # Cross-check: compare total words in segments vs channel words
        segment_word_count = sum(len(s.words) for s in result_segments)
        channel_word_count = len(all_words_from_channel)
        if channel_word_count > segment_word_count:
            logger.warning(
                f"[ASR] Word mismatch: channel has {channel_word_count} words, "
                f"segments have {segment_word_count} words. "
                f"Missing {channel_word_count - segment_word_count} words."
            )

        cost_estimate = (duration / 60) * DEEPGRAM_COST_PER_MINUTE

        logger.info(f"Deepgram transcription complete: {len(result_segments)} segments, {segment_word_count} words. Est Cost: ${cost_estimate:.4f}")
        
        if on_progress:
            on_progress(len(result_segments), 1.0)

        return TranscriptionResult(
            segments=result_segments,
            language=detected_language,
            language_probability=language_probability,
            duration=duration,
            provider="deepgram",
            model=target_model,
            metadata={
                "processing_time_s": elapsed_time,
                "cost_estimate_usd": cost_estimate
            }
        )

    def _extract_detected_language(
        self,
        channel: dict,
        alternatives: list[dict],
        metadata: dict,
        requested_language: str | None,
    ) -> str:
        """
        Extract the detected language from the Deepgram response.
        
        Deepgram returns the detected language in different locations depending
        on the request mode and SDK version. This method checks all known locations
        in priority order:
        
        1. channel.detected_language — standard location for detect_language=True
        2. alternatives[0].detected_language — some SDK versions
        3. alternatives[0].languages — array of detected languages with confidence
        4. Per-word language field — when using language=multi
        5. metadata.detected_language — some response formats
        
        Falls back to the requested language if detection didn't run,
        or "unknown" if nothing is available.
        """
        detected = None
        
        # 1. Channel-level detected_language (most common for detect_language=True)
        detected = channel.get("detected_language")
        if detected:
            logger.debug(f"Language from channel.detected_language: '{detected}'")
            return detected
        
        # 2. Alternative-level detected_language
        if alternatives:
            alt = alternatives[0]
            detected = alt.get("detected_language")
            if detected:
                logger.debug(f"Language from alternatives[0].detected_language: '{detected}'")
                return detected
            
            # 3. Languages array with confidence scores
            languages = alt.get("languages", [])
            if languages:
                # Languages is a list like ["en"] or could include confidence info
                if isinstance(languages, list) and len(languages) > 0:
                    if isinstance(languages[0], str):
                        detected = languages[0]
                    elif isinstance(languages[0], dict):
                        detected = languages[0].get("language", languages[0].get("code"))
                    if detected:
                        logger.debug(f"Language from alternatives[0].languages: '{detected}'")
                        return detected
            
            # 4. Per-word language detection (multi mode — PRIMARY for auto-detection)
            # In multi mode, each word has a "language" field. We determine the
            # dominant language by counting word occurrences. This is the most
            # reliable detection method because it analyzes ALL speech, not just
            # a snippet.
            raw_words = alt.get("words", [])
            if raw_words:
                word_languages = [w.get("language") for w in raw_words if w.get("language")]
                if word_languages:
                    from collections import Counter
                    lang_counts = Counter(word_languages)
                    dominant_lang = lang_counts.most_common(1)[0][0]
                    total = len(word_languages)
                    dominant_count = lang_counts[dominant_lang]
                    confidence_pct = (dominant_count / total * 100) if total > 0 else 0
                    logger.info(
                        f"Per-word language detection: '{dominant_lang}' "
                        f"({dominant_count}/{total} words = {confidence_pct:.0f}%) | "
                        f"Distribution: {dict(lang_counts)}"
                    )
                    return dominant_lang
        
        # 5. Metadata-level detected_language
        detected = metadata.get("detected_language")
        if detected:
            logger.debug(f"Language from metadata.detected_language: '{detected}'")
            return detected
        
        # 6. Fall back to requested language if it was explicitly set (not auto)
        if requested_language and requested_language not in ("auto", "multi", None):
            logger.info(
                f"No detected_language in response. Using requested language: "
                f"'{requested_language}'"
            )
            return requested_language
        
        # 7. Last resort — return "unknown" rather than silently defaulting to
        #    a specific language like Hindi or English, which would mask the issue.
        logger.warning(
            "Could not determine language from Deepgram response. "
            "Returning 'unknown'. Check Deepgram response structure."
        )
        return "unknown"
    
    def _extract_language_confidence(
        self,
        channel: dict,
        alternatives: list[dict],
    ) -> float:
        """
        Extract language detection confidence from the Deepgram response.
        
        Checks:
        1. channel.language_confidence
        2. alternatives[0].confidence
        3. alternatives[0].languages[0].confidence
        
        Returns 1.0 as default if no confidence value is found (e.g., when
        the language was explicitly specified rather than auto-detected).
        """
        # 1. Channel-level confidence
        conf = channel.get("language_confidence")
        if conf is not None:
            return float(conf)
        
        # 2. Alternative-level confidence
        if alternatives:
            alt = alternatives[0]
            conf = alt.get("confidence")
            if conf is not None:
                return float(conf)
            
            # 3. Languages array confidence
            languages = alt.get("languages", [])
            if languages and isinstance(languages, list) and len(languages) > 0:
                if isinstance(languages[0], dict):
                    conf = languages[0].get("confidence")
                    if conf is not None:
                        return float(conf)
        
        return 1.0
