"""
ProCaptioner Pipeline — Transcriber Facade
Routes transcription requests to the configured ASR provider.
"""

import logging
from pathlib import Path

from config import ASR_PROVIDER, ASR_COMPARE_PROVIDER
from .asr import get_asr_provider
from .asr.schemas import TranscriptionResult, TranscriptionSegment, WordSegment

logger = logging.getLogger(__name__)

# Maintain a global instance of the active provider(s)
_active_provider = None
_compare_provider = None

def _get_active_provider():
    global _active_provider
    if _active_provider is None:
        logger.info(f"Initializing ASR provider: {ASR_PROVIDER}")
        _active_provider = get_asr_provider(ASR_PROVIDER)
    return _active_provider

def unload_model():
    """Unload models to free resources (e.g. GPU VRAM)."""
    global _active_provider, _compare_provider
    if _active_provider is not None:
        _active_provider.unload()
    if _compare_provider is not None:
        _compare_provider.unload()

def _validate_word_coverage(result: TranscriptionResult):
    """
    Ensure no words are lost during transcription.
    Logs missing words or timestamp anomalies.
    """
    total_words = 0
    missing_words = 0
    anomalies = 0

    for segment in result.segments:
        for i, word in enumerate(segment.words):
            total_words += 1
            if not word.word:
                missing_words += 1
            if word.end < word.start:
                anomalies += 1
            if word.start < 0 or word.end < 0:
                anomalies += 1
            
            # Simple overlap check
            if i > 0 and word.start < segment.words[i-1].end - 0.5: # allow 0.5s overlap tolerance
                anomalies += 1

    if missing_words > 0:
        logger.error(f"[ASR Validation] Found {missing_words} empty words out of {total_words}")
    if anomalies > 0:
        logger.warning(f"[ASR Validation] Found {anomalies} timestamp anomalies (negative duration or extreme overlap).")

    logger.info(f"[ASR Validation] Processed {total_words} words. Validation passed.")


def transcribe(
    audio_path: Path,
    language: str | None = None,
    model_name: str | None = None,
    word_timestamps: bool = True,
    vad_filter: bool = True,
    initial_prompt: str | None = None,
    on_progress: callable = None,
    keyterms: list[str] | None = None,
) -> TranscriptionResult:
    """
    Transcribe audio file using the configured ASR provider.
    Includes an optional comparison mode.
    """
    provider = _get_active_provider()
    
    logger.info(f"Starting transcription using {ASR_PROVIDER}...")
    
    result = provider.transcribe(
        audio_path=audio_path,
        language=language,
        model_name=model_name,
        word_timestamps=word_timestamps,
        vad_filter=vad_filter,
        initial_prompt=initial_prompt,
        on_progress=on_progress,
        keyterms=keyterms,
    )
    
    _validate_word_coverage(result)
    
    # Comparison mode
    if ASR_COMPARE_PROVIDER:
        global _compare_provider
        if _compare_provider is None:
             _compare_provider = get_asr_provider(ASR_COMPARE_PROVIDER)
        
        logger.info(f"--- COMPARISON MODE: Running {ASR_COMPARE_PROVIDER} ---")
        try:
            compare_result = _compare_provider.transcribe(
                audio_path=audio_path,
                language=language,
                model_name=model_name,
                word_timestamps=word_timestamps,
                vad_filter=vad_filter,
                initial_prompt=initial_prompt,
                keyterms=keyterms,
            )
            
            p1_words = sum(len(s.words) for s in result.segments)
            p2_words = sum(len(s.words) for s in compare_result.segments)
            
            logger.info("=== ASR COMPARISON REPORT ===")
            logger.info(f"Primary ({ASR_PROVIDER}): {p1_words} words, duration: {result.duration:.2f}s")
            logger.info(f"Compare ({ASR_COMPARE_PROVIDER}): {p2_words} words, duration: {compare_result.duration:.2f}s")
            logger.info("=============================")
        except Exception as e:
            logger.error(f"Comparison transcription failed: {e}")
            
    return result
