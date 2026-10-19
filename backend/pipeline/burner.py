"""
ProCaptioner Pipeline — Subtitle Burner
Burns subtitles into video using FFmpeg.
Supports styled ASS subtitles and GPU-accelerated encoding (NVENC).
"""

import logging
import subprocess
from pathlib import Path

from config import FFMPEG_BIN, FONT_DIR
from pipeline.audio_extractor import probe_video

logger = logging.getLogger(__name__)


def burn_subtitles(
    video_path: Path,
    subtitle_path: Path,
    output_path: Path,
    use_gpu_encoding: bool = True,
    video_codec: str | None = None,
    crf: int = 18,
) -> Path:
    """
    Burn subtitles into a video file using FFmpeg.

    Uses the ASS subtitle filter for styled rendering, with Noto Sans fonts
    for proper Indian script support (Devanagari, Tamil, Telugu, etc.).

    Args:
        video_path: Path to the input video.
        subtitle_path: Path to the ASS/SRT subtitle file.
        output_path: Path for the output video with burned subtitles.
        use_gpu_encoding: Try NVENC GPU encoding (falls back to CPU).
        video_codec: Override video codec (e.g., "libx264", "h264_nvenc").
        crf: Constant Rate Factor (lower = higher quality, 18 is visually lossless).

    Returns:
        Path to the output video file.
    """
    # Determine subtitle filter based on file extension
    sub_ext = subtitle_path.suffix.lower()
    if sub_ext == ".ass":
        # ASS filter preserves all styling (fonts, colors, positioning)
        sub_filter = f"ass='{_escape_path(subtitle_path)}'"
    else:
        # SRT/VTT filter with font configuration
        sub_filter = (
            f"subtitles='{_escape_path(subtitle_path)}':"
            f"fontsdir='{_escape_path(FONT_DIR)}':"
            f"force_style='FontName=Noto Sans,FontSize=24,PrimaryColour=&H00FFFFFF,"
            f"OutlineColour=&H00000000,Outline=2,Shadow=1'"
        )

    # Add fonts directory for ASS rendering
    if sub_ext == ".ass" and FONT_DIR.exists():
        # FFmpeg looks for fonts in the specified directory
        sub_filter = f"ass='{_escape_path(subtitle_path)}':fontsdir='{_escape_path(FONT_DIR)}'"

    # Select video codec
    if video_codec:
        codec = video_codec
    elif use_gpu_encoding and _check_nvenc_support():
        codec = "h264_nvenc"
        logger.info("Using NVENC GPU encoding.")
    else:
        codec = "libx264"
        logger.info("Using CPU encoding (libx264).")

    # Build FFmpeg command
    cmd = [
        FFMPEG_BIN,
        "-i", str(video_path),
        "-vf", sub_filter,
        "-c:v", codec,
    ]

    # Codec-specific options
    if codec == "h264_nvenc":
        cmd.extend(["-preset", "p4", "-rc", "vbr", "-cq", str(crf)])
    elif codec == "libx264":
        cmd.extend(["-preset", "medium", "-crf", str(crf)])

    cmd.extend([
        "-c:a", "copy",          # Copy audio without re-encoding
        "-movflags", "+faststart",  # Enable fast start for web playback
        "-y",                     # Overwrite output
        str(output_path),
    ])

    logger.info(f"Burning subtitles into video: {' '.join(cmd)}")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=1800,  # 30-minute timeout for long videos
    )

    if result.returncode != 0:
        # If NVENC failed, retry with CPU encoding
        if codec == "h264_nvenc":
            logger.warning("NVENC encoding failed, falling back to CPU...")
            return burn_subtitles(
                video_path, subtitle_path, output_path,
                use_gpu_encoding=False, crf=crf,
            )
        raise RuntimeError(f"Subtitle burn-in failed: {result.stderr}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Subtitle burn-in produced an empty file.")

    logger.info(f"Burn-in complete: {output_path}")
    return output_path


_nvenc_tested = False
_nvenc_functional = False


def _check_nvenc_support() -> bool:
    """Check if NVENC GPU encoding is actually functional without errors."""
    global _nvenc_tested, _nvenc_functional
    if _nvenc_tested:
        return _nvenc_functional
    try:
        r = subprocess.run(
            [FFMPEG_BIN, "-f", "lavfi", "-i", "color=c=black:s=64x64:d=0.1", "-c:v", "h264_nvenc", "-f", "null", "-"],
            capture_output=True,
            timeout=3,
        )
        _nvenc_functional = (r.returncode == 0)
    except Exception:
        _nvenc_functional = False
    _nvenc_tested = True
    return _nvenc_functional


def _escape_path(path: Path) -> str:
    """Escape path for FFmpeg filter syntax (Windows backslashes, colons)."""
    s = str(path).replace("\\", "/").replace(":", "\\:")
    return s
