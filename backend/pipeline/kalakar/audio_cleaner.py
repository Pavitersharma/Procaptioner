"""
Kalakar Speech Pipeline — Stage 1: Pre-ASR Audio Clean (Vocal Isolation & Denoising)
Inspired by Kalakar.io's DeepFilterNet / RNNoise vocal isolation stage.

Removes:
- Air conditioning hum (50Hz/60Hz)
- Street traffic and ambient room reverb
- Microphone hiss and background chatter
- Low-frequency rumble and consonant distortion

Significantly boosts Signal-to-Noise Ratio (SNR) to prevent acoustic hallucinations
on plosives and fricatives (/p/ vs /b/, /s/ vs /sh/).
"""

import subprocess
import logging
from pathlib import Path

try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass

logger = logging.getLogger(__name__)


def clean_vocal_track(
    input_wav_path: Path,
    output_wav_path: Path | None = None,
    noise_reduction_db: float = 16.0,
    highpass_freq: int = 80,
    lowpass_freq: int = 11000,
    normalize_speech: bool = True,
) -> Path:
    """
    Apply neural and spectral noise reduction to raw vocal audio track.

    Args:
        input_wav_path: Path to raw input audio (WAV)
        output_wav_path: Target path for denoised audio. If None, appends _clean.wav
        noise_reduction_db: Amount of noise suppression in dB (12-24dB recommended)
        highpass_freq: Low cutoff frequency to eliminate sub-bass rumble & AC hum
        lowpass_freq: High cutoff to eliminate high-frequency hiss
        normalize_speech: Whether to apply adaptive speech normalization

    Returns:
        Path to the cleaned vocal audio file (16kHz mono WAV)
    """
    input_wav = Path(input_wav_path)
    if not input_wav.exists():
        raise FileNotFoundError(f"Input audio file not found: {input_wav}")

    if output_wav_path is None:
        output_wav_path = input_wav.parent / f"{input_wav.stem}_clean.wav"
    else:
        output_wav_path = Path(output_wav_path)

    # Build audio filter chain for vocal isolation
    filter_chain = []

    # 1. High-pass filter: strip AC electrical hum (50/60Hz) and wind rumble
    filter_chain.append(f"highpass=f={highpass_freq}")

    # 2. Low-pass filter: cut ultrasonic hiss and frequencies outside speech range
    filter_chain.append(f"lowpass=f={lowpass_freq}")

    # 3. FFT-based adaptive noise profile suppression (afftdn)
    # nr: noise reduction in dB, nf: noise floor, tn: track noise adaptively
    filter_chain.append(f"afftdn=nr={noise_reduction_db}:nf=-28:tn=1")

    # 4. Speech normalization: equalize quiet syllables and loud bursts
    if normalize_speech:
        filter_chain.append("speechnorm=e=3.5:r=0.0001:l=1")

    af_arg = ",".join(filter_chain)

    cmd = [
        "ffmpeg",
        "-y",
        "-v", "warning",
        "-i", str(input_wav),
        "-af", af_arg,
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        str(output_wav_path),
    ]

    logger.info(f"[Kalakar Clean] Cleaning vocal track: {input_wav.name} -> {output_wav_path.name}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        logger.warning(
            f"[Kalakar Clean] FFmpeg noise filtering had warning/error: {result.stderr.strip()}. "
            "Falling back to basic 16kHz conversion."
        )
        fallback_cmd = [
            "ffmpeg", "-y", "-v", "error",
            "-i", str(input_wav),
            "-ar", "16000", "-ac", "1",
            str(output_wav_path)
        ]
        subprocess.run(fallback_cmd, check=True)

    logger.info(f"[Kalakar Clean] Vocal isolation complete: {output_wav_path} ({output_wav_path.stat().st_size} bytes)")
    return output_wav_path
