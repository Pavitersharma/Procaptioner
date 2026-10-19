"""
ProCaptioner Subtitle Engine — Configuration
Central configuration for paths, GPU, model selection, and limits.
"""

import os
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
MODEL_CACHE_DIR = BASE_DIR / "models"
FONT_DIR = BASE_DIR / "fonts"

# Create directories on import
for d in [UPLOAD_DIR, OUTPUT_DIR, MODEL_CACHE_DIR, FONT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── Upload Limits ────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = 2000  # 2GB max upload
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v", ".flv"}

# ─── Subtitle Defaults ───────────────────────────────────────────────────────
MAX_CHARS_PER_LINE = 42
MAX_LINES_PER_SUB = 2
MIN_SUBTITLE_DURATION_MS = 500
MAX_SUBTITLE_DURATION_MS = 7000

# ─── FFmpeg ───────────────────────────────────────────────────────────────────
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass

FFMPEG_BIN = "ffmpeg"
FFPROBE_BIN = "ffprobe"

# ─── Server ───────────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
]

# ─── ASR Configuration ────────────────────────────────────────────────────────
import os
from dotenv import load_dotenv

load_dotenv()

ASR_PROVIDER = os.getenv("ASR_PROVIDER", "whisper")  # 'deepgram' or 'whisper'
ASR_COMPARE_PROVIDER = os.getenv("ASR_COMPARE_PROVIDER", None)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
DEEPGRAM_MODEL = os.getenv("DEEPGRAM_MODEL", "nova-3")
DEEPGRAM_COST_PER_MINUTE = float(os.getenv("DEEPGRAM_COST_PER_MINUTE", "0.0043"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

