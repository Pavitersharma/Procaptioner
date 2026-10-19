"""
ProCaptioner Pipeline — LLM Post-Correction
Uses Gemini to fix spelling mistakes in ASR transcripts and provide
both native-script and romanized versions of subtitles.

IMPORTANT RULES:
- Words may be corrected (spelling fixes).
- Words must NOT be added or removed.
- Timestamps must NEVER be modified.
- The number of words must remain the same.
"""

import json
import logging
from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

# Lazy-init the client
_client = None

def _get_client():
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set.")
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


# ─── Language metadata for prompt generation ─────────────────────────────────

# Languages that use Latin script — no romanization needed
LATIN_SCRIPT_LANGUAGES = {
    "en", "es", "fr", "de", "it", "pt", "nl", "pl", "sv", "no", "da", "fi",
    "cs", "ro", "hu", "tr", "hr", "sk", "sl", "lt", "lv", "et", "ca",
    "vi", "id", "ms", "tl", "sw", "yo", "ig", "ha", "zu", "so",
}

# Script names for prompting the LLM
LANGUAGE_SCRIPT_NAMES = {
    "hi": "Devanagari", "mr": "Devanagari", "ne": "Devanagari", "sa": "Devanagari",
    "bn": "Bengali", "as": "Bengali",
    "gu": "Gujarati",
    "pa": "Gurmukhi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "or": "Odia",
    "ur": "Arabic (Nastaliq)",
    "ar": "Arabic",
    "fa": "Persian (Arabic)",
    "he": "Hebrew",
    "ja": "Japanese (Kanji/Hiragana/Katakana)",
    "ko": "Korean (Hangul)",
    "zh": "Chinese (Simplified)",
    "th": "Thai",
    "my": "Myanmar",
    "km": "Khmer",
    "am": "Ethiopic",
}

LANGUAGE_DISPLAY_NAMES = {
    "hi": "Hindi", "mr": "Marathi", "ne": "Nepali", "sa": "Sanskrit",
    "bn": "Bengali", "as": "Assamese", "gu": "Gujarati", "pa": "Punjabi",
    "ta": "Tamil", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam",
    "or": "Odia", "ur": "Urdu",
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "ru": "Russian", "nl": "Dutch",
    "ja": "Japanese", "ko": "Korean", "zh": "Chinese", "ar": "Arabic",
    "fa": "Persian", "he": "Hebrew", "th": "Thai",
}


def _build_prompt(words: list[dict], detected_language: str) -> str:
    """
    Build a language-aware correction prompt for Gemini.
    
    Instead of assuming all content is Hindi/Devanagari, adapts the prompt
    to the actual detected language so the LLM corrects words in the
    correct script and language.
    """
    word_list = [{"i": i, "w": w["word"]} for i, w in enumerate(words)]
    word_count = len(words)
    
    lang_name = LANGUAGE_DISPLAY_NAMES.get(detected_language, detected_language)
    script_name = LANGUAGE_SCRIPT_NAMES.get(detected_language, "")
    is_latin = detected_language in LATIN_SCRIPT_LANGUAGES
    
    # Core correction instruction
    prompt = f"""You are a subtitle correction assistant.

The following words were transcribed from audio using ASR (speech-to-text).
The detected language is: {lang_name} ({detected_language})

WORDS (JSON array with index and word):
{json.dumps(word_list, ensure_ascii=False)}

YOUR TASK:
1. Fix any spelling mistakes in the words."""

    # Add language-specific guidance
    if is_latin:
        prompt += f"""
2. The audio is in {lang_name}. Keep all words in their original Latin script.
3. Fix typos, missing diacritics, and ASR artifacts.
4. If there are words from other languages mixed in, keep them as-is.

CRITICAL RULES:
- You MUST return EXACTLY {word_count} words. Do NOT add or remove words.
- Only fix spelling. Do NOT rephrase or rewrite.

Return ONLY valid JSON in this exact format, no markdown:
{{
  "corrected": ["word1", "word2", ...],
  "roman": ["word1", "word2", ...]
}}

Since {lang_name} already uses Latin script, "corrected" and "roman" should be identical."""

    else:
        # Non-Latin script language (Indic, CJK, Arabic, etc.)
        code_switch_note = ""
        if detected_language in ("hi", "mr", "gu", "ne", "bn", "pa", "ta", "te", "kn", "ml"):
            code_switch_note = f"\nThe audio may contain code-switched content (mixed {lang_name}/English). Keep English words in English in both versions."
        
        prompt += f"""
2. The audio is in {lang_name}{f' ({script_name} script)' if script_name else ''}.
3. For {lang_name} words, provide the correct {script_name or 'native'} spelling.
4. For any English words mixed in, keep them in English.{code_switch_note}
5. Also provide a ROMANIZED (Latin script) version of each word.

CRITICAL RULES:
- You MUST return EXACTLY {word_count} words. Do NOT add or remove words.
- Only fix spelling. Do NOT rephrase or rewrite.
- Keep English words as English in both versions.
- For {script_name or 'native script'} words, the roman version should be a natural transliteration.

Return ONLY valid JSON in this exact format, no markdown:
{{
  "corrected": ["word1_native", "word2_native", ...],
  "roman": ["word1_roman", "word2_roman", ...]
}}"""

    return prompt


def correct_transcript(words: list[dict], detected_language: str = "hi") -> dict:
    """
    Send word list to Gemini for spelling correction and romanization.
    Processes in chunks to avoid word count mismatches and token limits.
    """
    if detected_language in ("unknown", ""):
        logger.info(f"[LLM] Skipping correction for unknown language.")
        return None
    
    client = _get_client()
    
    logger.info(f"[LLM] Running correction for language: {detected_language} ({len(words)} words)")

    CHUNK_SIZE = 30
    corrected_words = []
    roman_words = []
    
    for i in range(0, len(words), CHUNK_SIZE):
        chunk = words[i:i + CHUNK_SIZE]
        prompt = _build_prompt(chunk, detected_language)
        
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )

            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3].strip()

            result = json.loads(raw_text)
            
            chunk_corrected = result.get("corrected", [])
            chunk_roman = result.get("roman", [])

            # Check if this chunk is valid
            if len(chunk_corrected) != len(chunk):
                logger.warning(
                    f"[LLM] Chunk word count mismatch: expected {len(chunk)}, "
                    f"got {len(chunk_corrected)} corrected. Skipping this chunk."
                )
                chunk_corrected = [w["word"] for w in chunk]
                
            if len(chunk_roman) != len(chunk):
                chunk_roman = chunk_corrected

        except Exception as e:
            logger.error(f"[LLM] Gemini correction failed for chunk: {e}")
            chunk_corrected = [w["word"] for w in chunk]
            chunk_roman = chunk_corrected

        # Build output for this chunk
        for j, orig in enumerate(chunk):
            corrected_words.append({
                "word": chunk_corrected[j],
                "start": orig["start"],
                "end": orig["end"],
                "confidence": orig.get("confidence", orig.get("probability", 1.0)),
            })
            roman_words.append({
                "word": chunk_roman[j],
                "start": orig["start"],
                "end": orig["end"],
                "confidence": orig.get("confidence", orig.get("probability", 1.0)),
            })

    native_text = " ".join([w["word"] for w in corrected_words])
    roman_text = " ".join([w["word"] for w in roman_words])

    logger.info(
        f"[LLM] Correction complete ({detected_language}): {len(corrected_words)} words. "
        f"Native: {native_text[:80]}... | Roman: {roman_text[:80]}..."
    )

    return {
        "corrected_words": corrected_words,
        "roman_words": roman_words,
        "native_text": native_text,
        "roman_text": roman_text,
    }
