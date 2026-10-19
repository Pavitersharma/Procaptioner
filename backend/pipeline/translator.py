"""
ProCaptioner Pipeline — Translator (Cloud)
Translates subtitle text using Google Gemini 2.0 Flash.
"""

import logging
from config import GEMINI_API_KEY, GEMINI_MODEL
from languages import get_language
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def translate_subtitles(
    texts: list[str],
    source_lang: str,
    target_lang: str,
    batch_size: int = 20,
    on_progress: callable = None,
) -> list[str]:
    """
    Translate a list of subtitle texts from source to target language using Gemini.

    Args:
        texts: List of subtitle text strings to translate.
        source_lang: Source language code (e.g., "en", "hi").
        target_lang: Target language code (e.g., "ta", "mr").
        batch_size: Number of texts to translate at once (Gemini handles larger batches well).
        on_progress: Callback(translated_count, total) for progress.

    Returns:
        List of translated strings (same length as input).
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set. Cannot translate.")

    target = get_language(target_lang)
    source = get_language(source_lang)

    if target is None:
        raise ValueError(f"Unknown target language: {target_lang}")
    if source is None:
        raise ValueError(f"Unknown source language: {source_lang}")

    logger.info(
        f"Translating {len(texts)} segments: "
        f"{source.name} ({source.code}) → {target.name} ({target.code}) "
        f"[engine: {GEMINI_MODEL}]"
    )

    client = genai.Client(api_key=GEMINI_API_KEY)
    model = GEMINI_MODEL
    
    # We will process in batches to not overwhelm the context window, though Gemini can handle a lot.
    all_translated: list[str] = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        prompt = f"""
You are an expert subtitle translator. Translate the following {len(batch)} subtitle segments from {source.name} to {target.name}.
Maintain the exact same number of lines and meaning. Do not add any extra text or conversational filler.
Respond ONLY with the translated text, with each segment separated by "|||".
Here are the segments:

""" + "\n|||\n".join(batch)
        
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )
        
        translated_text = response.text.strip()
        translated_segments = [s.strip() for s in translated_text.split("|||")]
        
        # If Gemini didn't return the exact number of segments, we pad or truncate to prevent alignment crashes
        if len(translated_segments) < len(batch):
            logger.warning(f"Gemini returned fewer segments ({len(translated_segments)}) than requested ({len(batch)}). Padding with originals.")
            translated_segments.extend(batch[len(translated_segments):])
        elif len(translated_segments) > len(batch):
            logger.warning(f"Gemini returned more segments ({len(translated_segments)}) than requested ({len(batch)}). Truncating.")
            translated_segments = translated_segments[:len(batch)]
            
        all_translated.extend(translated_segments)

        if on_progress:
            on_progress(len(all_translated), len(texts))

    logger.info(f"Translation complete: {len(all_translated)} segments.")
    return all_translated
