"""
ProCaptioner Pipeline — Premium Subtitle Template Exporter & Compositor
Renders exact subtitle templates (gradients, SVG ornaments, multi-tier typography,
word-level highlights, and decorative frames) onto videos using Headless Chromium + FFmpeg.
Guarantees pixel-perfect match with the live editor preview, master video quality,
and jitter-free frame-locked synchronization.
"""

import asyncio
import base64
import html
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from config import FFMPEG_BIN, FONT_DIR
from pipeline.audio_extractor import probe_video

logger = logging.getLogger(__name__)

# Virtual coordinate reference short side (matching editor REF_SHORT_SIDE)
REF_SHORT_SIDE = 480

SENTENCE_BREAK = re.compile(r"[.!?,;:\u0964\u0965\u061F\u060C]$")

_nvenc_tested = False
_nvenc_available = False


def check_nvenc_functional() -> bool:
    """Test if h264_nvenc actually encodes frames on this system without crashing."""
    global _nvenc_tested, _nvenc_available
    if _nvenc_tested:
        return _nvenc_available
    try:
        r = subprocess.run(
            [
                FFMPEG_BIN,
                "-f", "lavfi",
                "-i", "color=c=black:s=64x64:d=0.1",
                "-c:v", "h264_nvenc",
                "-f", "null",
                "-",
            ],
            capture_output=True,
            timeout=3,
        )
        _nvenc_available = (r.returncode == 0)
    except Exception:
        _nvenc_available = False
    _nvenc_tested = True
    return _nvenc_available


def find_browser_executable() -> str | None:
    """Find installed Chrome or Edge executable on Windows/Linux/macOS."""
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
        os.path.expanduser(r"~\AppData\Local\Microsoft\Edge\Application\msedge.exe"),
        "google-chrome",
        "google-chrome-stable",
        "chromium-browser",
        "chromium",
        "microsoft-edge",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
        found = shutil.which(c)
        if found:
            return found
    return None


def hex_to_rgba(hex_code: str, alpha: float) -> str:
    """Convert hex color (#ffffff or #fff) to rgba string."""
    if not hex_code or not hex_code.startswith("#"):
        return f"rgba(255, 255, 255, {alpha})"
    h = hex_code.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) >= 6:
        try:
            r = int(h[0:2], 16)
            g = int(h[2:4], 16)
            b = int(h[4:6], 16)
            return f"rgba({r}, {g}, {b}, {alpha})"
        except ValueError:
            pass
    return f"rgba(255, 255, 255, {alpha})"


def get_local_fonts_css(font_dir: Path) -> str:
    """
    Generate CSS @font-face rules with base64 data URIs for all local TTF fonts.
    This guarantees 0ms offline availability without network latency or font pop-in.
    """
    css_rules = []
    if not font_dir.exists():
        return ""

    font_mapping = [
        ("Playfair Display", 700, "normal", "PlayfairDisplay-700.ttf"),
        ("Playfair Display", 700, "italic", "PlayfairDisplay-700-Italic.ttf"),
        ("Playfair Display", 800, "normal", "PlayfairDisplay-800.ttf"),
        ("Inter", 400, "normal", "Inter-400.ttf"),
        ("Inter", 600, "normal", "Inter-600.ttf"),
        ("Inter", 700, "normal", "Inter-700.ttf"),
        ("Inter", 800, "normal", "Inter-800.ttf"),
        ("Inter", 900, "normal", "Inter-900.ttf"),
        ("Geist", 400, "normal", "Geist-400.ttf"),
        ("Geist", 600, "normal", "Geist-600.ttf"),
        ("Geist", 700, "normal", "Geist-700.ttf"),
        ("Geist", 800, "normal", "Geist-800.ttf"),
        ("Geist", 900, "normal", "Geist-900.ttf"),
        ("Montserrat", 400, "normal", "Montserrat-400.ttf"),
        ("Montserrat", 700, "normal", "Montserrat-700.ttf"),
        ("Montserrat", 800, "normal", "Montserrat-800.ttf"),
        ("Montserrat", 900, "normal", "Montserrat-900.ttf"),
        ("Anton", 400, "normal", "Anton-Regular.ttf"),
        ("Caveat", 400, "normal", "Caveat-400.ttf"),
        ("Caveat", 700, "normal", "Caveat-700.ttf"),
        ("Lora", 500, "normal", "Lora-VariableFont_wght.ttf"),
        ("Lora", 500, "italic", "Lora-Italic-VariableFont_wght.ttf"),
        ("Noto Sans Devanagari", 400, "normal", "NotoSansDevanagari-Regular.ttf"),
        ("Noto Sans Devanagari", 700, "normal", "NotoSansDevanagari-700.ttf"),
        ("Noto Sans Devanagari", 800, "normal", "NotoSansDevanagari-800.ttf"),
        ("Noto Sans Devanagari", 900, "normal", "NotoSansDevanagari-900.ttf"),
        ("Roboto Mono", 400, "normal", "RobotoMono-400.ttf"),
        ("Roboto Mono", 500, "normal", "RobotoMono-500.ttf"),
        ("Roboto Mono", 700, "normal", "RobotoMono-700.ttf"),
    ]

    for family, weight, style, filename in font_mapping:
        file_path = font_dir / filename
        if file_path.exists():
            try:
                data = base64.b64encode(file_path.read_bytes()).decode("ascii")
                css_rules.append(
                    f"@font-face {{\n"
                    f"  font-family: '{family}';\n"
                    f"  font-weight: {weight};\n"
                    f"  font-style: {style};\n"
                    f"  font-display: block;\n"
                    f"  src: url('data:font/truetype;charset=utf-8;base64,{data}') format('truetype');\n"
                    f"}}"
                )
            except Exception as e:
                logger.warning(f"Failed to embed font {filename}: {e}")

    return "\n\n".join(css_rules)


def get_active_caption_chunk(
    sub: dict,
    time_sec: float,
    words_per_caption: int = 3,
    script: str = "native",
) -> tuple[str, list[dict]]:
    """
    Split a subtitle segment into short word groups (max words_per_caption),
    breaking early on punctuation, and return (chunk_key, words_with_active_flag).
    Matches getActiveCaptionChunk in frontend editor-store.tsx 1:1.
    """
    max_words = max(1, round(words_per_caption or 3))
    raw_words = sub.get("words", [])

    words = []
    for w in raw_words:
        w_text = w.get("roman_word") if (script == "roman" and w.get("roman_word")) else w.get("word", "")
        words.append({
            "text": str(w_text).strip(),
            "start": float(w.get("start", 0)),
            "end": float(w.get("end", 0)),
        })

    # If word timestamps are missing, fall back to evenly-spaced words
    if not words:
        full_text = sub.get("roman_text") if (script == "roman" and sub.get("roman_text")) else sub.get("text", "")
        tokens = [t.strip() for t in full_text.split() if t.strip()]
        sub_start = float(sub.get("start", 0))
        sub_end = float(sub.get("end", 0))
        duration = max(0.1, sub_end - sub_start)
        step = duration / max(1, len(tokens))
        for i, t in enumerate(tokens):
            words.append({
                "text": t,
                "start": sub_start + i * step,
                "end": sub_start + (i + 1) * step,
            })

    words = [w for w in words if w["text"]]
    if not words:
        return f"{sub.get('index', 0)}-empty", []

    # Build chunks
    chunks: list[list[dict]] = []
    current: list[dict] = []
    for w in words:
        current.append(w)
        if len(current) >= max_words or SENTENCE_BREAK.search(w["text"]):
            chunks.append(current)
            current = []
    if current:
        chunks.append(current)

    # Active chunk = last chunk that has started
    chunk_idx = 0
    for i, ch in enumerate(chunks):
        if time_sec >= ch[0]["start"]:
            chunk_idx = i
        else:
            break

    chunk = chunks[chunk_idx]
    chunk_words = [
        {
            "text": w["text"],
            "active": (time_sec >= w["start"] and time_sec <= w["end"]),
        }
        for w in chunk
    ]
    return f"{sub.get('index', 0)}-{chunk_idx}", chunk_words


def build_subtitle_timeline(
    subtitles: list[dict],
    caption_style: dict,
    script: str = "native",
    video_duration: float = 0.0,
) -> tuple[list[dict], dict[str, dict]]:
    """
    Construct the discrete visual timeline for the entire video.
    Returns:
      segments: list of {"start": float, "end": float, "duration": float, "state_id": str}
      unique_states: dict of state_id -> state_data
    """
    words_per_cap = caption_style.get("wordsPerCaption", 3)

    # Collect all key timestamps
    timestamps = set([0.0])
    if video_duration > 0:
        timestamps.add(round(video_duration, 4))

    for sub in subtitles:
        s_start = max(0.0, float(sub.get("start", 0)))
        s_end = max(s_start, float(sub.get("end", 0)))
        timestamps.add(round(s_start, 4))
        timestamps.add(round(s_end, 4))
        for w in sub.get("words", []):
            w_start = max(s_start, float(w.get("start", 0)))
            w_end = max(w_start, float(w.get("end", 0)))
            timestamps.add(round(w_start, 4))
            timestamps.add(round(w_end, 4))

    sorted_times = sorted(list(timestamps))
    raw_segments = []

    unique_states: dict[str, dict] = {
        "empty": {"type": "empty", "words": [], "isRTL": False}
    }

    for i in range(len(sorted_times) - 1):
        t_start = sorted_times[i]
        t_end = sorted_times[i + 1]
        dur = t_end - t_start
        if dur <= 0.005:  # Ignore microscopic sub-frame intervals
            continue

        mid_t = (t_start + t_end) / 2.0

        # Find active subtitle entry
        active_sub = None
        for sub in subtitles:
            s_start = float(sub.get("start", 0))
            s_end = float(sub.get("end", 0))
            if s_start <= mid_t <= s_end:
                active_sub = sub
                break

        if not active_sub:
            state_id = "empty"
        else:
            chunk_key, chunk_words = get_active_caption_chunk(
                active_sub, mid_t, words_per_cap, script
            )
            if not chunk_words:
                state_id = "empty"
            else:
                words_repr = "|".join(f"{w['text']}:{'1' if w['active'] else '0'}" for w in chunk_words)
                state_id = f"{chunk_key}::{words_repr}"
                if state_id not in unique_states:
                    unique_states[state_id] = {
                        "type": "caption",
                        "words": chunk_words,
                    }

        raw_segments.append({
            "start": t_start,
            "end": t_end,
            "duration": dur,
            "state_id": state_id,
        })

    # Merge consecutive identical states
    merged_segments = []
    for seg in raw_segments:
        if merged_segments and merged_segments[-1]["state_id"] == seg["state_id"]:
            merged_segments[-1]["end"] = seg["end"]
            merged_segments[-1]["duration"] = round(seg["end"] - merged_segments[-1]["start"], 4)
        else:
            merged_segments.append(dict(seg))

    return merged_segments, unique_states


def _clean_id(raw_id: str) -> str:
    """Convert arbitrary state_id string to a valid DOM element ID."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_id)


def _golden_divider_html() -> str:
    """Return the Filigree Center Divider Ornament with diamond flourish."""
    return (
        '<div style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; max-width: 240px; margin-top: 8px;">'
        '<div style="height: 1.5px; flex: 1; background: linear-gradient(to right, transparent, rgba(245,158,11,0.8), #f59e0b);"></div>'
        '<span style="font-size: 0.62em; color: #f59e0b; text-shadow: 0 0 8px rgba(245,158,11,0.9); line-height: 1;">◆</span>'
        '<div style="height: 1.5px; flex: 1; background: linear-gradient(to left, transparent, rgba(245,158,11,0.8), #f59e0b);"></div>'
        '</div>'
    )


def _render_preset_content(
    layout_preset: str,
    caption_style: dict,
    words: list[dict],
    font_family: str,
    secondary_font: str,
    font_size: float,
    font_weight: int,
    text_color: str,
    highlight_color: str,
    highlight_grad_start: str | None,
    highlight_grad_end: str | None,
    secondary_text_color: str,
    text_shadow: str,
    letter_spacing: str,
    is_rtl: bool,
) -> str:
    """Generate HTML snippet matching all 10 premium presets and custom styling."""
    if not words:
        return ""

    direction = "rtl" if is_rtl else "ltr"

    # Find active word index (default to 0 if none active yet)
    active_word_idx = -1
    for idx, w in enumerate(words):
        if w.get("active"):
            active_word_idx = idx
            break
    target_active_idx = active_word_idx if active_word_idx >= 0 else min(1, len(words) - 1)

    # ──────────────────────────────────────────────────────────────────────────
    # 01. EDITORIAL BOLD (High-Fashion Cinematic Magazine Typography)
    # ──────────────────────────────────────────────────────────────────────────
    if layout_preset == "editorial-bold":
        butter_yellow = highlight_color or text_color or "#fef08a"
        lead_word = words[0]["text"] if words else "your"
        lead_active = words[0].get("active", False) if words else False
        trailing = words[1:] if len(words) > 1 else []

        lead_shadow = "0 0 24px rgba(254,240,138,0.95), 0 4px 16px rgba(0,0,0,0.95)" if lead_active else "0 3px 14px rgba(0,0,0,0.95)"
        lead_transform = "scale(1.05)" if lead_active else "scale(1)"
        lead_html = (
            f'<span style="font-family: \'{font_family}\', Georgia, serif; font-size: 0.88em; font-style: italic; '
            f'font-weight: 500; color: {butter_yellow}; text-shadow: {lead_shadow}; text-transform: lowercase; '
            f'transform: {lead_transform}; margin-right: 8px; display: inline-block;">{html.escape(lead_word)}</span>'
        )

        trailing_spans = []
        for w in trailing:
            is_act = w.get("active", False)
            t_shadow = "0 0 28px rgba(254,240,138,0.95), 0 4px 18px rgba(0,0,0,0.95)" if is_act else "0 4px 18px rgba(0,0,0,0.95)"
            t_trans = "scale(1.05)" if is_act else "scale(1)"
            trailing_spans.append(
                f'<span style="font-family: \'{font_family}\', \'Cinzel\', Georgia, serif; font-size: 1.25em; '
                f'font-weight: 900; color: {butter_yellow}; text-shadow: {t_shadow}; text-transform: uppercase; '
                f'transform: {t_trans}; margin: 0 4px; display: inline-block;">{html.escape(w["text"])}</span>'
            )

        if not trailing:
            return f"""
            <div style="display: inline-flex; align-items: baseline; justify-content: center; font-size: {font_size}px; direction: {direction};">
              <span style="font-family: '{font_family}', 'Cinzel', Georgia, serif; font-size: 1.25em; font-weight: 900; color: {butter_yellow}; text-shadow: 0 4px 18px rgba(0,0,0,0.95); text-transform: uppercase;">
                {html.escape(lead_word)}
              </span>
            </div>
            """

        return f"""
        <div style="display: inline-flex; align-items: baseline; justify-content: center; font-size: {font_size}px; direction: {direction};">
          {lead_html}
          {''.join(trailing_spans)}
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 02. GOLDEN FRAME (Majestic Gold Typography + Filigree Ornament)
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "golden-frame":
        if len(words) == 1:
            kicker_lines = []
            hero_lines = [words[0]["text"]]
        elif len(words) == 2:
            kicker_lines = [words[0]["text"]]
            hero_lines = [words[1]["text"]]
        elif len(words) == 3:
            kicker_lines = [words[0]["text"]]
            hero_lines = [words[1]["text"], words[2]["text"]]
        else:
            split_pt = min(3, len(words) // 2)
            kicker_lines = [w["text"] for w in words[:split_pt]]
            hero_lines = [w["text"] for w in words[split_pt:]]

        kicker_spans = "".join(
            f'<span style="font-family: \'{secondary_font}\', sans-serif; font-weight: 500; font-size: 0.68em; '
            f'letter-spacing: 0.05em; color: {secondary_text_color}; text-transform: uppercase; '
            f'filter: drop-shadow(0 2px 10px rgba(0,0,0,0.95)); display: block;">{html.escape(line)}</span>'
            for line in kicker_lines
        )

        hero_spans = "".join(
            f'<span class="gold-gradient-text" style="font-size: 2.3em; font-weight: {font_weight}; '
            f'letter-spacing: {letter_spacing}; text-transform: uppercase; line-height: 0.9; display: block;">'
            f'{html.escape(line)}</span>'
            for line in hero_lines
        )

        divider = _golden_divider_html()

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: {font_size}px; direction: {direction};">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 18px; padding: 8px 16px;">
            {'<div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; text-align: left;">' + kicker_spans + '</div>' if kicker_lines else ''}
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 0.88; text-align: left;">
                {hero_spans}
              </div>
              {divider}
            </div>
          </div>
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 03. KINETIC FOCUS
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "kinetic-focus":
        words_spans = []
        for idx, w in enumerate(words):
            is_focal = (idx == target_active_idx)
            text_str = html.escape(w["text"].upper())

            if is_focal:
                if highlight_grad_start and highlight_grad_end:
                    grad_style = (
                        f"background: linear-gradient(to right, {highlight_grad_start}, {highlight_grad_end}); "
                        f"-webkit-background-clip: text; -webkit-text-fill-color: transparent; color: transparent; "
                    )
                else:
                    grad_style = f"color: {highlight_color or '#22c55e'}; "

                focal_style = (
                    f"transform: scale(1.5) skewX(-4deg); z-index: 10; font-weight: 900; {grad_style}"
                    f"filter: drop-shadow(0 0 24px rgba(34,197,94,0.85)) drop-shadow(0 4px 12px rgba(0,0,0,0.95)); "
                )
                words_spans.append(
                    f'<span style="display: inline-block; text-transform: uppercase; margin: 0 6px; {focal_style}">{text_str}</span>'
                )
            else:
                normal_style = (
                    "font-weight: 800; color: #ffffff; -webkit-text-stroke: 1.5px black; "
                    "paint-order: stroke fill; text-shadow: 0 3px 8px rgba(0,0,0,0.9); margin: 0 4px; "
                )
                words_spans.append(
                    f'<span style="display: inline-block; text-transform: uppercase; {normal_style}">{text_str}</span>'
                )

        return f"""
        <div style="display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; font-size: {font_size}px; font-family: '{font_family}', sans-serif; direction: {direction};">
          {''.join(words_spans)}
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 04. LUXURY MAGAZINE
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "luxury-magazine":
        kicker = words[0]["text"] if len(words) > 0 else "Live a"
        hero = words[1]["text"] if len(words) > 1 else (words[0]["text"] if words else "")
        secondary = " ".join(w["text"] for w in words[2:]) if len(words) > 2 else ""

        sec_html = f'<span style="margin-top: 4px; align-self: flex-end; font-size: 0.48em; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(233,213,255,0.8); font-family: monospace;">— {html.escape(secondary)}</span>' if secondary else ""

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: flex-start; font-size: {font_size}px; direction: {direction};">
          <div style="display: inline-flex; flex-direction: column; align-items: flex-start; border-radius: 12px; background: rgba(0,0,0,0.55); padding: 12px 24px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.8); backdrop-filter: blur(8px);">
            <span style="font-size: 0.45em; letter-spacing: 0.2em; font-weight: 500; text-transform: uppercase; color: rgba(255,255,255,0.6); font-family: '{secondary_font}', sans-serif;">{html.escape(kicker)}</span>
            <span style="margin-top: 2px; font-size: 1.28em; font-weight: 700; font-style: italic; color: #ffffff; text-shadow: 0 3px 14px rgba(0,0,0,0.85); font-family: '{font_family}', serif;">{html.escape(hero)}</span>
            {sec_html}
          </div>
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 05. CREATOR PODCAST
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "creator-podcast":
        kicker = words[0]["text"] if words else "IDEAS"
        words_html = []
        for w in words:
            if w.get("active"):
                words_html.append(
                    f'<span style="border-radius: 6px; background: linear-gradient(to right, #7c3aed, #4f46e5); padding: 2px 8px; color: #ffffff; font-weight: 900; box-shadow: 0 4px 14px rgba(124,58,237,0.5); font-size: 1.08em; text-shadow: 0 0 16px rgba(139,92,246,0.8); margin: 0 3px; transform: scale(1.05); display: inline-block;">{html.escape(w["text"])}</span>'
                )
            else:
                words_html.append(
                    f'<span style="color: #ffffff; font-weight: 800; text-shadow: 0 2px 6px rgba(0,0,0,0.8); margin: 0 3px; display: inline-block;">{html.escape(w["text"])}</span>'
                )

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: {font_size}px; direction: {direction};">
          <div style="display: inline-flex; flex-direction: column; align-items: center; border-radius: 16px; background: rgba(12, 10, 9, 0.85); padding: 12px 24px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 40px rgba(0,0,0,0.8); backdrop-filter: blur(8px);">
            <span style="font-family: monospace; font-size: 0.42em; letter-spacing: 0.24em; font-weight: 700; text-transform: uppercase; color: #a78bfa;">{html.escape(kicker)}</span>
            <div style="margin-top: 4px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; font-family: '{font_family}', sans-serif;">
              {''.join(words_html)}
            </div>
          </div>
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 06. MINIMAL STATEMENT
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "minimal-statement":
        statement_spans = []
        for idx, w in enumerate(words):
            is_highlight = (idx == target_active_idx)
            color = highlight_color or "#38bdf8" if is_highlight else "#f8fafc"
            statement_spans.append(
                f'<span style="font-weight: 900; text-transform: uppercase; font-size: 1.25em; letter-spacing: -0.03em; '
                f'color: {color}; text-shadow: 0 4px 18px rgba(0,0,0,0.92); line-height: 1.05; display: block;">{html.escape(w["text"])}</span>'
            )

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: flex-start; font-size: {font_size}px; font-family: '{font_family}', sans-serif; direction: {direction};">
          {''.join(statement_spans)}
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 07. SPLIT WORD
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "split-word":
        w1 = words[0]["text"] if len(words) > 0 else "THE"
        w2 = words[1]["text"] if len(words) > 1 else "WAY"
        bottom = " ".join(w["text"] for w in words[2:]) if len(words) > 2 else "YOU THINK"

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: center; font-size: {font_size}px; font-family: '{font_family}', sans-serif; direction: {direction};">
          <div style="display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 24px;">
            <span style="font-weight: 900; text-transform: uppercase; color: white; -webkit-text-stroke: 1.5px black; paint-order: stroke fill; text-shadow: 3px 3px 0 #000, 0 6px 16px rgba(0,0,0,0.85); font-size: 1.15em;">{html.escape(w1)}</span>
            <span style="font-weight: 900; text-transform: uppercase; color: rgba(255,255,255,0.9); font-style: italic; -webkit-text-stroke: 1.5px black; paint-order: stroke fill; text-shadow: 3px 3px 0 #000, 0 6px 16px rgba(0,0,0,0.85); font-size: 1.15em;">{html.escape(w2)}</span>
          </div>
          <div style="margin-top: 4px; display: flex; align-items: center; justify-content: center;">
            <span style="font-weight: 900; text-transform: uppercase; color: {highlight_color or '#facc15'}; -webkit-text-stroke: 2px black; paint-order: stroke fill; text-shadow: 4px 4px 0 #000, 0 8px 24px rgba(250,204,21,0.45); font-size: 1.28em;">{html.escape(bottom)}</span>
          </div>
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 08. CINEMATIC QUOTE
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "cinematic-quote":
        kicker = words[0]["text"] if words else "SUCCESS IS A"
        hero = words[1]["text"] if len(words) > 1 else (words[0]["text"] if words else "")
        secondary = " ".join(w["text"] for w in words[2:]) if len(words) > 2 else ""

        sec_html = (
            f'<span style="font-family: \'{secondary_font}\', Georgia, serif; font-size: 0.52em; font-style: italic; '
            f'letter-spacing: 0.05em; color: #d6d3d1;">{html.escape(secondary)}</span>'
            if secondary else ""
        )

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: {font_size}px; direction: {direction};">
          <div style="display: inline-flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.5); padding: 12px 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(8px);">
            <span style="font-family: '{secondary_font}', sans-serif; font-size: 0.45em; letter-spacing: 0.28em; font-weight: 500; text-transform: uppercase; color: rgba(255,255,255,0.65);">{html.escape(kicker)}</span>
            <span style="margin-top: 4px; font-family: '{font_family}', 'Playfair Display', serif; font-size: 1.2em; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: {highlight_color or '#fde047'}; text-shadow: 0 2px 16px rgba(253,224,71,0.4), 0 4px 10px rgba(0,0,0,0.9);">{html.escape(hero)}</span>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 6px 0;">
              <span style="height: 1px; width: 40px; background: rgba(251,191,36,0.4);"></span>
              <span style="font-size: 0.42em; color: rgba(251,191,36,0.8);">✦</span>
              <span style="height: 1px; width: 40px; background: rgba(251,191,36,0.4);"></span>
            </div>
            {sec_html}
          </div>
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 09. DYNAMIC HIGHLIGHT
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "dynamic-highlight":
        words_spans = []
        for idx, w in enumerate(words):
            is_highlight = (idx == target_active_idx)
            if is_highlight:
                words_spans.append(
                    f'<span style="border-radius: 6px; background: #f59e0b; padding: 2px 10px; font-weight: 900; '
                    f'color: #000000; text-transform: uppercase; box-shadow: 0 4px 14px rgba(245,158,11,0.3); '
                    f'transform: rotate(-1deg); font-size: 1.08em; letter-spacing: -0.01em; margin: 0 4px; display: inline-block;">'
                    f'{html.escape(w["text"])}</span>'
                )
            else:
                words_spans.append(
                    f'<span style="color: white; font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; '
                    f'-webkit-text-stroke: 1.5px black; paint-order: stroke fill; text-shadow: 0 3px 10px rgba(0,0,0,0.9); '
                    f'margin: 0 4px; display: inline-block;">{html.escape(w["text"])}</span>'
                )

        return f"""
        <div style="display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: center; font-size: {font_size}px; font-family: '{font_family}', sans-serif; direction: {direction};">
          {''.join(words_spans)}
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # 10. VERTICAL PREMIUM
    # ──────────────────────────────────────────────────────────────────────────
    elif layout_preset == "vertical-premium":
        kicker = words[0]["text"] if words else "Create Your Own"
        hero = words[1]["text"] if len(words) > 1 else (words[0]["text"] if words else "")
        secondary = " ".join(w["text"] for w in words[2:]) if len(words) > 2 else "Be Unique"

        return f"""
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: {font_size}px; direction: {direction};">
          <div style="display: inline-flex; flex-direction: column; align-items: center; border-radius: 16px; background: rgba(9, 9, 11, 0.8); padding: 14px 28px; border: 1px solid rgba(168,85,247,0.3); box-shadow: 0 12px 40px rgba(0,0,0,0.85); backdrop-filter: blur(8px);">
            <span style="font-family: '{secondary_font}', sans-serif; font-size: 0.48em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.85);">{html.escape(kicker)}</span>
            <span style="margin-top: 4px; font-family: '{caption_style.get('secondaryFontFamily') or 'Caveat'}', cursive; font-size: 1.38em; font-weight: 700; color: {highlight_color or '#c084fc'}; text-shadow: 0 0 20px rgba(192,132,252,0.85), 0 3px 8px rgba(0,0,0,0.9); line-height: 1.2;">{html.escape(hero)}</span>
            <span style="margin-top: 6px; border-radius: 9999px; background: rgba(255,255,255,0.1); padding: 2px 10px; font-family: monospace; font-size: 0.4em; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1);">{html.escape(secondary)}</span>
          </div>
        </div>
        """

    # ──────────────────────────────────────────────────────────────────────────
    # Standard & Custom Presets (Matches captionStyleToCSS 1:1)
    # ──────────────────────────────────────────────────────────────────────────
    else:
        bg_color = caption_style.get("bgColor", "#000000")
        bg_opacity = float(caption_style.get("bgOpacity", 0.0))
        bg_rgba = hex_to_rgba(bg_color, bg_opacity)
        padding = caption_style.get("padding", "6px 14px")
        border_radius = f"{caption_style.get('borderRadius', 4)}px"
        line_height = str(caption_style.get("lineHeight", 1.3))
        font_style = caption_style.get("fontStyle", "normal")
        text_transform = caption_style.get("textTransform", "none")
        stroke_width = float(caption_style.get("strokeWidth", 0))
        stroke_color = caption_style.get("strokeColor", "")
        box_shadow = caption_style.get("boxShadow", "")
        border = caption_style.get("border", "")
        backdrop_filter = caption_style.get("backdropFilter", "")
        accent_style = caption_style.get("accentStyle", "none")
        style_preset = caption_style.get("stylePreset", "")

        container_styles = [
            f"background-color: {bg_rgba}",
            f"padding: {padding}",
            f"border-radius: {border_radius}",
            f"line-height: {line_height}",
            f"font-style: {font_style}",
            f"text-transform: {text_transform}",
            f"font-family: '{font_family}', sans-serif",
            f"font-size: {font_size}px",
            f"font-weight: {font_weight}",
            f"letter-spacing: {letter_spacing}",
            f"color: {text_color}",
            f"paint-order: stroke fill",
        ]

        if text_shadow:
            container_styles.append(f"text-shadow: {text_shadow}")
        if stroke_width > 0 and stroke_color:
            container_styles.append(f"-webkit-text-stroke: {stroke_width}px {stroke_color}")
        if box_shadow:
            container_styles.append(f"box-shadow: {box_shadow}")
        if border:
            container_styles.append(f"border: {border}")
        if backdrop_filter:
            container_styles.append(f"backdrop-filter: {backdrop_filter}")

        words_spans = []
        for w in words:
            is_cur = w.get("active", False)
            word_styles = ["position: relative", "display: inline-block"]
            extra_content = ""

            if is_cur:
                word_styles.append(f"color: {highlight_color}")
                word_styles.append(f"font-weight: {min(900, font_weight + 100)}")

                if accent_style == "glow-word":
                    word_styles.append(f"text-shadow: 0 0 20px {highlight_color}, 0 0 40px {highlight_color}")
                elif accent_style == "script":
                    s_font = caption_style.get("secondaryFontFamily") or "Caveat"
                    word_styles.append(f"font-family: '{s_font}', cursive, sans-serif")
                    word_styles.append("font-size: 1.25em")
                    word_styles.append(f"color: {secondary_text_color or highlight_color}")
                elif accent_style == "circle-oval":
                    word_styles.append(f"border: 2px solid {highlight_color}")
                    word_styles.append("border-radius: 9999px")
                    word_styles.append("padding: 1px 8px")
                elif accent_style == "marker-pill":
                    word_styles.append(f"background: {highlight_color}")
                    word_styles.append("color: #000000")
                    word_styles.append("border-radius: 6px")
                    word_styles.append("padding: 2px 8px")

            if style_preset == "Goa" and is_cur:
                extra_content = (
                    '<svg viewBox="0 0 100 20" style="position: absolute; bottom: -8px; left: 0; right: 0; height: 10px; width: 100%; color: #34d399;" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">'
                    '<path d="M5,12 Q25,2 45,12 T85,12 T95,6" />'
                    '</svg>'
                )

            words_spans.append(
                f'<span style="{"; ".join(word_styles)}">{html.escape(w["text"])}{extra_content}</span>'
            )

        return f"""
        <div style="display: inline-block; max-width: 100%; direction: {direction}; {'; '.join(container_styles)}">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.28em 0.1em; justify-content: inherit;">
            {''.join(words_spans)}
          </div>
        </div>
        """


def generate_render_html(
    unique_states: dict[str, dict],
    caption_style: dict,
    video_width: int,
    video_height: int,
    is_rtl: bool = False,
) -> str:
    """
    Generate an HTML document containing all unique subtitle template states.
    Uses exact CSS, gradients, SVG ornaments, dividers, and responsive scaling.
    """
    short_side = min(video_width, video_height)
    scale = short_side / float(REF_SHORT_SIDE)
    vw = (video_width / float(short_side)) * REF_SHORT_SIDE
    vh = (video_height / float(short_side)) * REF_SHORT_SIDE

    layout_preset = caption_style.get("layoutPreset") or "default"
    font_family = caption_style.get("fontFamily") or "Cinzel"
    secondary_font = caption_style.get("secondaryFontFamily") or "Inter"
    font_size = float(caption_style.get("fontSize") or 36)
    font_weight = int(caption_style.get("fontWeight") or 800)
    y_offset = float(caption_style.get("yOffset") or 65)
    position = caption_style.get("position") or "bottom"
    alignment = caption_style.get("alignment") or "center"

    text_color = caption_style.get("textColor") or "#fef08a"
    highlight_color = caption_style.get("highlightColor") or "#f59e0b"
    highlight_grad_start = caption_style.get("highlightGradientStart")
    highlight_grad_end = caption_style.get("highlightGradientEnd")
    secondary_text_color = caption_style.get("secondaryTextColor") or "#ffffff"
    text_shadow = caption_style.get("textShadow") or "0 4px 18px rgba(0,0,0,0.95)"
    letter_spacing = f"{caption_style.get('letterSpacing', 0.04)}em"

    # Overlay vertical position CSS matching editor
    if position == "top":
        pos_css = f"top: {y_offset}%; bottom: auto;"
    elif position == "center":
        pos_css = "top: 50%; transform: translateY(-50%);"
    else:
        pos_css = f"bottom: {100 - y_offset}%; top: auto;"

    # Alignment justify
    if alignment == "left":
        justify_css = "justify-content: flex-start; text-align: left;"
    elif alignment == "right":
        justify_css = "justify-content: flex-end; text-align: right;"
    else:
        justify_css = "justify-content: center; text-align: center;"

    # Render state markup for each unique state
    states_markup = []
    for state_id, state in unique_states.items():
        if state["type"] == "empty":
            content_html = ""
        else:
            words = state["words"]
            content_html = _render_preset_content(
                layout_preset=layout_preset,
                caption_style=caption_style,
                words=words,
                font_family=font_family,
                secondary_font=secondary_font,
                font_size=font_size,
                font_weight=font_weight,
                text_color=text_color,
                highlight_color=highlight_color,
                highlight_grad_start=highlight_grad_start,
                highlight_grad_end=highlight_grad_end,
                secondary_text_color=secondary_text_color,
                text_shadow=text_shadow,
                letter_spacing=letter_spacing,
                is_rtl=is_rtl,
            )

        states_markup.append(
            f'<div id="state-{_clean_id(state_id)}" class="subtitle-state" style="display: none; max-width: 100%;">'
            f'{content_html}'
            f'</div>'
        )

    states_html = "\n".join(states_markup)
    local_fonts_css = get_local_fonts_css(FONT_DIR)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@400..700&family=Cinzel:wght@600;700;800;900&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Inter:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,500;1,500&family=Montserrat:ital,wght@0,600;0,700;0,800;0,900;1,700&family=Noto+Sans+Devanagari:wght@400;600;700;800;900&family=Noto+Sans+Gurmukhi:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@700;800&family=Outfit:wght@700;800&family=Geist:wght@400;600;700;800;900&display=swap');

{local_fonts_css}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}

  body {{
    background: transparent !important;
    width: {video_width}px;
    height: {video_height}px;
    overflow: hidden;
    position: relative;
    user-select: none;
    -webkit-font-smoothing: antialiased;
  }}

  #stage {{
    position: absolute;
    top: 0;
    left: 0;
    width: {vw}px;
    height: {vh}px;
    transform: scale({scale});
    transform-origin: 0 0;
    overflow: hidden;
  }}

  .subtitle-overlay-container {{
    position: absolute;
    left: 0;
    right: 0;
    padding: 0 6%;
    display: flex;
    {justify_css}
    {pos_css}
    z-index: 30;
    pointer-events: none;
  }}

  /* Gold Gradient Typography */
  .gold-gradient-text {{
    font-family: "{font_family}", "Playfair Display", Georgia, serif;
    background: linear-gradient(180deg, #fffbeb 0%, #fef08a 25%, #f59e0b 60%, #b45309 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 4px 18px rgba(0,0,0,0.95)) drop-shadow(0 0 20px rgba(245,158,11,0.35));
  }}
</style>
</head>
<body>
  <div id="stage">
    <div class="subtitle-overlay-container">
      {states_html}
    </div>
  </div>

  <script>
    window.showState = function(stateId) {{
      var states = document.querySelectorAll('.subtitle-state');
      for (var i = 0; i < states.length; i++) {{
        states[i].style.display = 'none';
      }}
      var el = document.getElementById('state-' + stateId);
      if (el) {{
        el.style.display = 'inline-flex';
      }}
    }};
  </script>
</body>
</html>"""
    return html_content


async def capture_subtitle_frames(
    html_content: str,
    unique_states: dict[str, dict],
    video_width: int,
    video_height: int,
    output_dir: Path,
) -> dict[str, Path]:
    """
    Launch headless Chrome/Edge via CDP, render the HTML template,
    and capture a transparent PNG for each unique subtitle state.
    Returns: dict of state_id -> Path to png
    """
    browser_exe = find_browser_executable()
    if not browser_exe:
        raise RuntimeError("Neither Chrome nor Edge was found on the system.")

    import websockets
    import random

    port = random.randint(9300, 9600)
    html_path = output_dir / "template.html"
    html_path.write_text(html_content, encoding="utf-8")
    file_url = html_path.as_uri()

    user_data_dir = tempfile.mkdtemp(prefix="procaptioner_chrome_")
    browser_cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--default-background-color=00000000",
        "--allow-file-access-from-files",
        "--disable-web-security",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
    ]

    print(f"[PROCAPTIONER EXPORT] Starting headless Chromium on port {port}...", flush=True)
    proc = subprocess.Popen(browser_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    captured_paths: dict[str, Path] = {}

    try:
        # Wait for debugging port
        ws_url = None
        for _ in range(60):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=1) as resp:
                    data = json.loads(resp.read().decode())
                    ws_url = data.get("webSocketDebuggerUrl")
                    if ws_url:
                        break
            except Exception:
                await asyncio.sleep(0.08)

        if not ws_url:
            raise RuntimeError(f"Failed to connect to Chromium CDP on port {port}")

        print(f"[PROCAPTIONER EXPORT] Connected to Chromium CDP. Rendering {len(unique_states)} template states...", flush=True)

        async with websockets.connect(ws_url, max_size=50 * 1024 * 1024) as browser_ws:
            msg_id = 0
            async def send_cdp(method, params=None, session_id=None):
                nonlocal msg_id
                msg_id += 1
                payload = {"id": msg_id, "method": method, "params": params or {}}
                if session_id:
                    payload["sessionId"] = session_id
                await browser_ws.send(json.dumps(payload))
                while True:
                    data = json.loads(await browser_ws.recv())
                    if data.get("id") == msg_id:
                        if "error" in data:
                            logger.error(f"CDP error for {method}: {data['error']}")
                        return data.get("result", {})

            # Create target and attach to it
            target = await send_cdp("Target.createTarget", {"url": "about:blank"})
            target_id = target["targetId"]

            attached = await send_cdp("Target.attachToTarget", {"targetId": target_id, "flatten": True})
            session_id = attached["sessionId"]

            # Configure page viewport & transparency
            await send_cdp("Page.enable", {}, session_id=session_id)
            await send_cdp("Emulation.setDeviceMetricsOverride", {
                "width": video_width,
                "height": video_height,
                "deviceScaleFactor": 1,
                "mobile": False,
            }, session_id=session_id)
            await send_cdp("Emulation.setDefaultBackgroundColorOverride", {
                "color": {"r": 0, "g": 0, "b": 0, "a": 0}
            }, session_id=session_id)

            # Navigate to template HTML file URL
            await send_cdp("Page.navigate", {"url": file_url}, session_id=session_id)

            # Await document fonts ready
            print("[PROCAPTIONER EXPORT] Awaiting font loading and layout engine...", flush=True)
            try:
                await send_cdp("Runtime.evaluate", {
                    "expression": "document.fonts.ready.then(() => true)",
                    "awaitPromise": True,
                }, session_id=session_id)
            except Exception:
                await asyncio.sleep(0.5)

            # Capture each unique state
            for state_id in unique_states.keys():
                clean_id = _clean_id(state_id)
                await send_cdp("Runtime.evaluate", {
                    "expression": f"window.showState('{clean_id}')"
                }, session_id=session_id)

                screenshot = await send_cdp("Page.captureScreenshot", {
                    "format": "png",
                    "captureBeyondViewport": True,
                }, session_id=session_id)

                data_str = screenshot.get("data")
                if not data_str:
                    logger.warning(f"Failed to capture screenshot for state: {clean_id}")
                    continue

                png_bytes = base64.b64decode(data_str)
                frame_path = output_dir / f"frame_{clean_id}.png"
                frame_path.write_bytes(png_bytes)
                captured_paths[state_id] = frame_path

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            pass
        shutil.rmtree(user_data_dir, ignore_errors=True)

    return captured_paths


async def burn_template_subtitles(
    video_path: Path,
    subtitles: list[dict],
    caption_style: dict,
    script: str = "native",
    detected_lang: str = "en",
    output_path: Path | None = None,
) -> Path:
    """
    Main export pipeline:
    1. Probes video dimensions, fps, and color format.
    2. Builds discrete subtitle timeline matching editor preview.
    3. Generates and renders HTML template states using Headless Chromium.
    4. Concat-overlays onto original video using FFmpeg with PTS frame-locking.
    """
    video_path = Path(video_path).resolve()
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # 1. Probe video metadata
    metadata = probe_video(video_path)
    video_width = metadata.get("width", 1080)
    video_height = metadata.get("height", 1920)
    video_duration = metadata.get("duration", 0.0)
    fps = metadata.get("fps", 30.0)
    if fps <= 0:
        fps = 30.0

    is_rtl = detected_lang in ["ar", "ur", "he", "fa"]

    # 2. Build timeline
    segments, unique_states = build_subtitle_timeline(
        subtitles=subtitles,
        caption_style=caption_style,
        script=script,
        video_duration=video_duration,
    )

    if not segments:
        logger.warning("No subtitle segments generated for export.")
        if output_path:
            shutil.copy(video_path, output_path)
            return output_path
        return video_path

    # Working temporary directory for frames and concat script
    work_dir = Path(tempfile.mkdtemp(prefix="procaptioner_export_"))

    try:
        # 3. Generate HTML
        html_content = generate_render_html(
            unique_states=unique_states,
            caption_style=caption_style,
            video_width=video_width,
            video_height=video_height,
            is_rtl=is_rtl,
        )

        # 4. Capture frames via Chromium
        state_frames = await capture_subtitle_frames(
            html_content=html_content,
            unique_states=unique_states,
            video_width=video_width,
            video_height=video_height,
            output_dir=work_dir,
        )

        # 5. Build ffconcat script
        concat_lines = ["ffconcat version 1.0"]
        empty_frame = state_frames.get("empty")

        for seg in segments:
            state_id = seg["state_id"]
            frame_path = state_frames.get(state_id)
            if not frame_path or not frame_path.exists():
                frame_path = empty_frame

            dur = max(0.01, seg["duration"])
            concat_lines.append(f"file '{frame_path.resolve().as_posix()}'")
            concat_lines.append(f"duration {dur:.4f}")

        # Final trailing entry required by ffconcat
        last_frame = empty_frame if empty_frame else list(state_frames.values())[0]
        concat_lines.append(f"file '{last_frame.resolve().as_posix()}'")

        concat_file = work_dir / "overlay_concat.txt"
        concat_file.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")

        # 6. Burn with FFmpeg
        if not output_path:
            output_path = video_path.parent / f"{video_path.stem}_burned.mp4"
        output_path = Path(output_path).resolve()

        use_nvenc = check_nvenc_functional()
        codec = "h264_nvenc" if use_nvenc else "libx264"

        # Frame-lock overlay filter: resamples overlay stream to exact video fps & rgba
        filter_str = f"[1:v]fps=fps={fps},format=rgba[sub];[0:v][sub]overlay=0:0:format=auto:shortest=1[outv]"

        cmd = [
            FFMPEG_BIN,
            "-i", str(video_path),
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-filter_complex", filter_str,
            "-map", "[outv]",
            "-map", "0:a?",
            "-c:v", codec,
        ]

        if codec == "h264_nvenc":
            cmd.extend(["-preset", "p4", "-rc", "vbr", "-cq", "16", "-pix_fmt", "yuv420p"])
        else:
            # Visually lossless CRF 16 with optimized preset preserving master details
            cmd.extend(["-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p"])

        # Preserve original audio without re-encoding
        cmd.extend([
            "-c:a", "copy",
            "-movflags", "+faststart",
            "-y",
            str(output_path),
        ])

        logger.info(f"Compositing video with burned template: {' '.join(cmd)}")
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
        )

        if res.returncode != 0 and codec == "h264_nvenc":
            logger.warning("NVENC composite failed, retrying with libx264...")
            cmd_cpu = [
                FFMPEG_BIN,
                "-i", str(video_path),
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_file),
                "-filter_complex", filter_str,
                "-map", "[outv]",
                "-map", "0:a?",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "16",
                "-pix_fmt", "yuv420p",
                "-c:a", "copy",
                "-movflags", "+faststart",
                "-y",
                str(output_path),
            ]
            res = await loop.run_in_executor(
                None,
                lambda: subprocess.run(cmd_cpu, capture_output=True, text=True, timeout=1800)
            )

        if res.returncode != 0:
            logger.error(f"FFmpeg composite failed: {res.stderr}")
            raise RuntimeError(f"FFmpeg export failed: {res.stderr}")

        logger.info(f"Video export successful: {output_path} ({output_path.stat().st_size} bytes)")
        return output_path

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
