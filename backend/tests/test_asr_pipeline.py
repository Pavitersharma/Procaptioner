import pytest
from pathlib import Path
from pipeline.asr.schemas import TranscriptionResult, TranscriptionSegment, WordSegment
from pipeline.transcriber import _validate_word_coverage

def test_validate_word_coverage_no_missing():
    result = TranscriptionResult(
        segments=[
            TranscriptionSegment(
                id=1,
                start=0.0,
                end=1.0,
                text="hello world",
                words=[
                    WordSegment(word="hello", start=0.0, end=0.5),
                    WordSegment(word="world", start=0.5, end=1.0)
                ]
            )
        ],
        language="en",
        language_probability=1.0,
        duration=1.0
    )
    
    # Should not raise any exceptions
    _validate_word_coverage(result)

def test_validate_word_coverage_anomalies():
    # Validation just logs, but we can call it to ensure it doesn't crash on anomalies
    result = TranscriptionResult(
        segments=[
            TranscriptionSegment(
                id=1,
                start=0.0,
                end=1.0,
                text="hello",
                words=[
                    WordSegment(word="", start=0.0, end=0.5), # empty word
                    WordSegment(word="anomaly", start=1.5, end=0.5) # negative duration
                ]
            )
        ],
        language="en",
        language_probability=1.0,
        duration=1.0
    )
    
    _validate_word_coverage(result)


# ─── Deepgram Language Detection Tests ────────────────────────────────────────

class TestDeepgramLanguageDetection:
    """Test the language detection extraction logic in DeepgramProvider."""

    def _make_provider(self):
        """Create a DeepgramProvider instance without needing a real API key."""
        from unittest.mock import patch
        with patch("pipeline.asr.deepgram_provider.DEEPGRAM_API_KEY", "test-key"):
            from pipeline.asr.deepgram_provider import DeepgramProvider
            # Bypass the __init__ client creation
            provider = object.__new__(DeepgramProvider)
        return provider

    def test_extract_language_from_channel(self):
        """Language detected at channel level (standard detect_language=True response)."""
        provider = self._make_provider()
        channel = {"detected_language": "bn"}
        result = provider._extract_detected_language(channel, [], {}, None)
        assert result == "bn"

    def test_extract_language_from_alternatives(self):
        """Language detected at alternative level."""
        provider = self._make_provider()
        channel = {}
        alternatives = [{"detected_language": "ta"}]
        result = provider._extract_detected_language(channel, alternatives, {}, None)
        assert result == "ta"

    def test_extract_language_from_languages_array_strings(self):
        """Language from alternatives[0].languages as string array."""
        provider = self._make_provider()
        channel = {}
        alternatives = [{"languages": ["pa"]}]
        result = provider._extract_detected_language(channel, alternatives, {}, None)
        assert result == "pa"

    def test_extract_language_from_languages_array_dicts(self):
        """Language from alternatives[0].languages as dict array with confidence."""
        provider = self._make_provider()
        channel = {}
        alternatives = [{"languages": [{"language": "te", "confidence": 0.95}]}]
        result = provider._extract_detected_language(channel, alternatives, {}, None)
        assert result == "te"

    def test_extract_language_from_per_word_detection(self):
        """Language determined by counting per-word language fields (multi mode)."""
        provider = self._make_provider()
        channel = {}
        alternatives = [{
            "words": [
                {"word": "hello", "language": "en"},
                {"word": "namaste", "language": "hi"},
                {"word": "kaise", "language": "hi"},
                {"word": "ho", "language": "hi"},
            ]
        }]
        result = provider._extract_detected_language(channel, alternatives, {}, None)
        assert result == "hi"  # Hindi is dominant (3 vs 1 English)

    def test_extract_language_from_metadata(self):
        """Language from metadata level."""
        provider = self._make_provider()
        channel = {}
        metadata = {"detected_language": "mr"}
        result = provider._extract_detected_language(channel, [], metadata, None)
        assert result == "mr"

    def test_extract_language_fallback_to_requested(self):
        """When no detection data, fall back to explicitly requested language."""
        provider = self._make_provider()
        result = provider._extract_detected_language({}, [], {}, "gu")
        assert result == "gu"

    def test_extract_language_fallback_unknown(self):
        """When nothing is available, return 'unknown' instead of defaulting to Hindi/English."""
        provider = self._make_provider()
        result = provider._extract_detected_language({}, [], {}, None)
        assert result == "unknown"

    def test_extract_language_auto_not_used_as_fallback(self):
        """'auto' should not be returned as the detected language."""
        provider = self._make_provider()
        result = provider._extract_detected_language({}, [], {}, "auto")
        assert result == "unknown"

    def test_extract_language_multi_not_used_as_fallback(self):
        """'multi' should not be returned as the detected language."""
        provider = self._make_provider()
        result = provider._extract_detected_language({}, [], {}, "multi")
        assert result == "unknown"


class TestDeepgramLanguageRouting:
    """Test that language routing sends correct parameters to Deepgram."""

    def test_hindi_routes_to_multi(self):
        """Hindi should use multi mode for code-switching support."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "hi" in HINDI_CODE_SWITCH_LANGUAGES

    def test_punjabi_not_routed_to_multi(self):
        """Punjabi should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "pa" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_bengali_not_routed_to_multi(self):
        """Bengali should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "bn" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_tamil_not_routed_to_multi(self):
        """Tamil should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "ta" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_telugu_not_routed_to_multi(self):
        """Telugu should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "te" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_kannada_not_routed_to_multi(self):
        """Kannada should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "kn" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_malayalam_not_routed_to_multi(self):
        """Malayalam should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "ml" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_marathi_not_routed_to_multi(self):
        """Marathi should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "mr" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_gujarati_not_routed_to_multi(self):
        """Gujarati should NOT be routed through multi mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES
        assert "gu" not in HINDI_CODE_SWITCH_LANGUAGES

    def test_english_not_routed_to_multi(self):
        """English should use direct language mode."""
        from pipeline.asr.deepgram_provider import HINDI_CODE_SWITCH_LANGUAGES, DEEPGRAM_SUPPORTED_LANGUAGES
        assert "en" not in HINDI_CODE_SWITCH_LANGUAGES
        assert "en" in DEEPGRAM_SUPPORTED_LANGUAGES

    def test_all_indian_languages_in_supported_set(self):
        """All major Indian languages should be in the Deepgram supported set."""
        from pipeline.asr.deepgram_provider import DEEPGRAM_SUPPORTED_LANGUAGES
        indian_langs = {"hi", "bn", "ta", "te", "kn", "ml", "mr", "gu", "pa", "ur", "ne"}
        for lang in indian_langs:
            assert lang in DEEPGRAM_SUPPORTED_LANGUAGES, f"{lang} missing from DEEPGRAM_SUPPORTED_LANGUAGES"


class TestLLMCorrectorLanguageAwareness:
    """Test that the LLM corrector adapts to different languages."""

    def test_prompt_for_hindi(self):
        """Hindi prompt should mention Devanagari and allow code-switching."""
        from pipeline.llm_corrector import _build_prompt
        words = [{"word": "नमस्ते", "start": 0.0, "end": 0.5, "confidence": 0.9}]
        prompt = _build_prompt(words, "hi")
        assert "Hindi" in prompt
        assert "Devanagari" in prompt
        assert "code-switch" in prompt.lower()

    def test_prompt_for_english(self):
        """English prompt should use Latin script mode (no romanization needed)."""
        from pipeline.llm_corrector import _build_prompt
        words = [{"word": "hello", "start": 0.0, "end": 0.5, "confidence": 0.9}]
        prompt = _build_prompt(words, "en")
        assert "English" in prompt
        assert "Latin script" in prompt
        # Should NOT mention Devanagari
        assert "Devanagari" not in prompt

    def test_prompt_for_bengali(self):
        """Bengali prompt should mention Bengali script, not Devanagari."""
        from pipeline.llm_corrector import _build_prompt
        words = [{"word": "হ্যালো", "start": 0.0, "end": 0.5, "confidence": 0.9}]
        prompt = _build_prompt(words, "bn")
        assert "Bengali" in prompt
        # Should NOT default to Hindi/Devanagari
        assert "Hindi" not in prompt

    def test_prompt_for_tamil(self):
        """Tamil prompt should mention Tamil script."""
        from pipeline.llm_corrector import _build_prompt
        words = [{"word": "வணக்கம்", "start": 0.0, "end": 0.5, "confidence": 0.9}]
        prompt = _build_prompt(words, "ta")
        assert "Tamil" in prompt

    def test_prompt_for_punjabi(self):
        """Punjabi prompt should mention Gurmukhi script."""
        from pipeline.llm_corrector import _build_prompt
        words = [{"word": "ਸਤ", "start": 0.0, "end": 0.3, "confidence": 0.9}]
        prompt = _build_prompt(words, "pa")
        assert "Punjabi" in prompt
        assert "Gurmukhi" in prompt

    def test_unknown_language_skipped(self):
        """Correction should be skipped for unknown languages."""
        from pipeline.llm_corrector import correct_transcript
        result = correct_transcript(
            [{"word": "test", "start": 0.0, "end": 0.5, "confidence": 0.9}],
            "unknown"
        )
        assert result is None

    def test_empty_language_skipped(self):
        """Correction should be skipped for empty language."""
        from pipeline.llm_corrector import correct_transcript
        result = correct_transcript(
            [{"word": "test", "start": 0.0, "end": 0.5, "confidence": 0.9}],
            ""
        )
        assert result is None
