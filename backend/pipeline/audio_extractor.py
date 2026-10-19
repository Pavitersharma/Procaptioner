"""
ProCaptioner Pipeline — Audio Extractor
Extracts audio from video files using FFmpeg, outputs 16kHz mono WAV for Whisper.
"""

import subprocess
import json
from pathlib import Path

from config import FFMPEG_BIN, FFPROBE_BIN


def probe_video(video_path: Path) -> dict:
    """
    Probe a video file and return stream metadata.
    Returns dict with keys: duration, has_audio, video_codec, audio_codec, width, height.
    """
    cmd = [
        FFPROBE_BIN,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")

    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    fmt = data.get("format", {})

    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]
    video_streams = [s for s in streams if s.get("codec_type") == "video"]

    fps = 30.0
    pix_fmt = "yuv420p"
    if video_streams:
        pix_fmt = video_streams[0].get("pix_fmt", "yuv420p")
        r_fps = video_streams[0].get("r_frame_rate") or video_streams[0].get("avg_frame_rate") or "30/1"
        try:
            if "/" in r_fps:
                num, den = map(float, r_fps.split("/"))
                if den > 0:
                    fps = round(num / den, 3)
            else:
                fps = float(r_fps)
        except Exception:
            fps = 30.0

    info = {
        "duration": float(fmt.get("duration", 0)),
        "has_audio": len(audio_streams) > 0,
        "audio_codec": audio_streams[0].get("codec_name", "unknown") if audio_streams else None,
        "audio_sample_rate": int(audio_streams[0].get("sample_rate", 0)) if audio_streams else 0,
        "video_codec": video_streams[0].get("codec_name", "unknown") if video_streams else None,
        "width": int(video_streams[0].get("width", 0)) if video_streams else 0,
        "height": int(video_streams[0].get("height", 0)) if video_streams else 0,
        "fps": fps if fps > 0 else 30.0,
        "pix_fmt": pix_fmt,
    }
    return info


def extract_audio(video_path: Path, output_path: Path, sample_rate: int = 16000) -> Path:
    """
    Extract audio from video and save as 16kHz mono WAV (optimal for Whisper).

    Args:
        video_path: Path to the input video file.
        output_path: Path for the output WAV file.
        sample_rate: Target sample rate (default 16000 for Whisper).

    Returns:
        Path to the extracted audio file.

    Raises:
        RuntimeError: If FFmpeg fails or video has no audio track.
    """
    # Check if video has audio
    info = probe_video(video_path)
    if not info["has_audio"]:
        raise RuntimeError("Video file has no audio track. Cannot generate subtitles.")

    # Extract audio: mono, 16-bit PCM, 16kHz
    cmd = [
        FFMPEG_BIN,
        "-i", str(video_path),
        "-vn",                    # No video
        "-acodec", "pcm_s16le",   # 16-bit PCM
        "-ar", str(sample_rate),  # 16kHz sample rate
        "-ac", "1",               # Mono channel
        "-y",                     # Overwrite output
        str(output_path),
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300,  # 5-minute timeout for long videos
    )

    if result.returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {result.stderr}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Audio extraction produced an empty file.")

    return output_path


def get_audio_duration(audio_path: Path) -> float:
    """Get the duration of an audio file in seconds."""
    cmd = [
        FFPROBE_BIN,
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    if result.returncode != 0:
        raise RuntimeError(f"Could not determine audio duration: {result.stderr}")
    return float(result.stdout.strip())
