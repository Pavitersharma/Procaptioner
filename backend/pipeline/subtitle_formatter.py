"""
ProCaptioner Pipeline — Subtitle Formatter
Converts aligned subtitle entries to SRT, VTT, and ASS formats.
Handles Unicode (Devanagari, Tamil, Telugu, Gurmukhi, etc.) and RTL text.
"""

import logging
from pathlib import Path

from pipeline.aligner import AlignedSubtitle

logger = logging.getLogger(__name__)


def _format_time_srt(seconds: float) -> str:
    """Format seconds to SRT time: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _format_time_vtt(seconds: float) -> str:
    """Format seconds to VTT time: HH:MM:SS.mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def _format_time_ass(seconds: float) -> str:
    """Format seconds to ASS time: H:MM:SS.cc (centiseconds)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int((seconds % 1) * 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


# ─── SRT Format ──────────────────────────────────────────────────────────────

def to_srt(subtitles: list[AlignedSubtitle]) -> str:
    """
    Convert subtitles to SRT (SubRip) format.
    Universal compatibility — works with VLC, YouTube, social media, etc.
    """
    lines = []
    for sub in subtitles:
        lines.append(str(sub.index))
        lines.append(f"{_format_time_srt(sub.start)} --> {_format_time_srt(sub.end)}")
        lines.append("\n".join(sub.lines))
        lines.append("")  # Blank line separator

    return "\n".join(lines)


# ─── VTT Format ──────────────────────────────────────────────────────────────

def to_vtt(subtitles: list[AlignedSubtitle]) -> str:
    """
    Convert subtitles to WebVTT format.
    Web-native — supports styling and positioning cues.
    """
    lines = ["WEBVTT", ""]

    for sub in subtitles:
        lines.append(str(sub.index))
        lines.append(f"{_format_time_vtt(sub.start)} --> {_format_time_vtt(sub.end)}")
        lines.append("\n".join(sub.lines))
        lines.append("")

    return "\n".join(lines)


# ─── ASS Format (for styled burn-in) ─────────────────────────────────────────

def hex_to_ass_color(hex_str: str | None, opacity: float = 1.0, default: str = "&H00FFFFFF") -> str:
    """
    Convert CSS hex color (#RRGGBB or #RGB) + opacity (0.0 to 1.0)
    to ASS &HAABBGGRR format (alpha: 00=opaque, FF=transparent; BGR order).
    """
    if not hex_str or not isinstance(hex_str, str):
        return default
    
    hex_clean = hex_str.strip().lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    elif len(hex_clean) == 8:
        hex_clean = hex_clean[:6]
    
    if len(hex_clean) != 6:
        return default
    
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
        clamped_opacity = max(0.0, min(1.0, float(opacity)))
        a = int(round((1.0 - clamped_opacity) * 255))
        return f"&H{a:02X}{b:02X}{g:02X}{r:02X}"
    except Exception:
        return default


def caption_style_to_ass_params(style: dict, video_height: int = 1080) -> dict:
    """
    Map frontend CaptionStyle dictionary to to_ass keyword arguments.
    """
    # Map web fonts to system-available fallbacks for FFmpeg rendering
    FONT_FALLBACK_MAP = {
        "Geist": "Arial",
        "Inter": "Arial",
        "Geist Mono": "Courier New",
        "Roboto Mono": "Courier New",
        "Anton": "Impact",
        "Caveat": "Comic Sans MS",
        "Playfair Display": "Times New Roman",
        "Cinzel": "Georgia",
        "Cormorant Garamond": "Times New Roman",
        "Plus Jakarta Sans": "Arial",
        "Outfit": "Arial",
        "Syne": "Arial",
        "Ephesis": "Segoe Script",
        "Lora": "Georgia",
        "Playwrite CU Guides": "Comic Sans MS",
    }

    font_name = style.get("fontFamily", "Arial")
    font_name = FONT_FALLBACK_MAP.get(font_name, font_name)

    web_font_size = float(style.get("fontSize", 32))
    font_size = int(round(web_font_size * 1.5))

    text_color = style.get("textColor", "#ffffff")
    primary_color = hex_to_ass_color(text_color, 1.0, "&H00FFFFFF")

    highlight_color = style.get("highlightColor", "#ffffff")
    secondary_color = hex_to_ass_color(highlight_color, 1.0, "&H000000FF")

    stroke_color = style.get("strokeColor", "#000000")
    stroke_width = int(style.get("strokeWidth", 0) or 0)
    outline_color = hex_to_ass_color(stroke_color, 1.0, "&H00000000") if stroke_width > 0 else "&H00000000"

    bg_color = style.get("bgColor", "#000000")
    bg_opacity = float(style.get("bgOpacity", 0.0))
    back_color = hex_to_ass_color(bg_color, bg_opacity, "&H80000000")

    bold = int(style.get("fontWeight", 700)) >= 600
    italic = style.get("fontStyle") == "italic"

    pos = style.get("position", "bottom")
    align = style.get("alignment", "center")

    if pos == "top":
        alignment = 7 if align == "left" else (9 if align == "right" else 8)
    elif pos == "center":
        alignment = 4 if align == "left" else (6 if align == "right" else 5)
    else:
        alignment = 1 if align == "left" else (3 if align == "right" else 2)

    y_offset = float(style.get("yOffset", 65))
    margin_v = int(video_height * (abs(100 - y_offset) / 100))
    margin_v = max(20, min(video_height - 100, margin_v))

    shadow_depth = 2 if style.get("textShadow") else 1

    return {
        "font_name": font_name,
        "font_size": font_size,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "outline_color": outline_color,
        "back_color": back_color,
        "outline_width": stroke_width,
        "shadow_depth": shadow_depth,
        "alignment": alignment,
        "margin_v": margin_v,
        "bold": bold,
        "italic": italic,
    }


def to_ass(
    subtitles: list[AlignedSubtitle],
    video_width: int = 1920,
    video_height: int = 1080,
    font_name: str = "Arial",
    font_size: int = 48,
    primary_color: str = "&H00FFFFFF",     # White
    secondary_color: str = "&H000000FF",   # Highlight/karaoke color
    outline_color: str = "&H00000000",     # Black
    back_color: str = "&H80000000",        # Semi-transparent black
    outline_width: int = 2,
    shadow_depth: int = 1,
    margin_v: int = 50,
    alignment: int = 2,  # Bottom-center
    bold: bool = True,
    italic: bool = False,
    is_rtl: bool = False,
) -> str:
    """
    Convert subtitles to ASS (Advanced SubStation Alpha) format.
    Used for styled burn-in with FFmpeg. Supports custom fonts, colors, and positioning.

    Color format: &HAABBGGRR (ASS uses BGR order, not RGB).
    Alignment: 1=bottom-left, 2=bottom-center, 3=bottom-right,
               4=mid-left, 5=mid-center, 6=mid-right,
               7=top-left, 8=top-center, 9=top-right
    """
    bold_flag = -1 if bold else 0
    italic_flag = -1 if italic else 0

    header = f"""[Script Info]
Title: ProCaptioner Subtitles
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},{secondary_color},{outline_color},{back_color},{bold_flag},{italic_flag},0,0,100,100,0,0,1,{outline_width},{shadow_depth},{alignment},20,20,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"""

    events = []
    for sub in subtitles:
        text = "\\N".join(sub.lines)  # ASS line break
        if is_rtl:
            # Add RTL Unicode mark for proper rendering
            text = "\u200F" + text
        start = _format_time_ass(sub.start)
        end = _format_time_ass(sub.end)
        events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return header + "\n" + "\n".join(events) + "\n"


# ─── JSON Format (for frontend display) ──────────────────────────────────────

def to_json(subtitles: list[AlignedSubtitle], lang_code: str = "en") -> list[dict]:
    """Convert subtitles to a JSON-friendly list of dictionaries, including both native and roman scripts."""
    roman_subtitles = _transliterate_subtitles(subtitles, lang_code)
    
    result = []
    for sub, roman_sub in zip(subtitles, roman_subtitles):
        entry = {
            "index": sub.index,
            "start": round(sub.start, 3),
            "end": round(sub.end, 3),
            "text": "\n".join(sub.lines),
            "roman_text": "\n".join(roman_sub.lines),
            "words": [
                {
                    "word": w.word,
                    "roman_word": rw.word,
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "confidence": round(w.probability, 3),
                }
                for w, rw in zip(sub.words, roman_sub.words)
            ],
        }
        result.append(entry)
    return result


# ─── File Writers ─────────────────────────────────────────────────────────────

def _transliterate_subtitles(subtitles: list[AlignedSubtitle], lang_code: str) -> list[AlignedSubtitle]:
    """Transliterate subtitles from Native script to Roman script."""
    try:
        from indic_transliteration import sanscript
    except ImportError:
        logger.warning("indic-transliteration not installed. Skipping transliteration.")
        sanscript = None

    # Map language codes to sanscript source schemes
    lang_to_scheme = {
        "hi": sanscript.DEVANAGARI if sanscript else None,
        "mr": sanscript.DEVANAGARI if sanscript else None,
        "ne": sanscript.DEVANAGARI if sanscript else None,
        "sa": sanscript.DEVANAGARI if sanscript else None,
        "bho": sanscript.DEVANAGARI if sanscript else None,
        "bn": sanscript.BENGALI if sanscript else None,
        "as": sanscript.BENGALI if sanscript else None,
        "gu": sanscript.GUJARATI if sanscript else None,
        "pa": sanscript.GURMUKHI if sanscript else None,
        "kn": sanscript.KANNADA if sanscript else None,
        "ml": sanscript.MALAYALAM if sanscript else None,
        "or": sanscript.ORIYA if sanscript else None,
        "ta": sanscript.TAMIL if sanscript else None,
        "te": sanscript.TELUGU if sanscript else None,
    }

    scheme = lang_to_scheme.get(lang_code)
    
    import copy
    transliterated = copy.deepcopy(subtitles)

    for sub in transliterated:
        roman_words_list = []
        for word in sub.words:
            if getattr(word, "roman_word", ""):
                roman_w = word.roman_word
            elif sanscript and scheme:
                roman_w = sanscript.transliterate(word.word, scheme, sanscript.ITRANS)
                roman_w = roman_w.replace("aa", "a").replace("ii", "i").replace("uu", "u").lower()
            else:
                roman_w = word.word
            word.word = roman_w
            roman_words_list.append(roman_w)

        # Reconstruct lines based on how many words were in each original line
        new_lines = []
        word_idx = 0
        for orig_line in sub.lines:
            # Count words in original line
            num_words = len(orig_line.split())
            if num_words > 0 and word_idx < len(roman_words_list):
                new_line = " ".join(roman_words_list[word_idx:word_idx + num_words])
                new_lines.append(new_line.capitalize())
                word_idx += num_words
            else:
                new_lines.append(orig_line)
        
        sub.lines = new_lines
            
    return transliterated


def save_srt(subtitles: list[AlignedSubtitle], output_path: Path, script: str = "native", lang_code: str = "") -> Path:
    """Save subtitles as SRT file."""
    if script == "roman":
        subtitles = _transliterate_subtitles(subtitles, lang_code)
        
    content = to_srt(subtitles)
    output_path.write_text(content, encoding="utf-8")
    logger.info(f"SRT saved: {output_path}")
    return output_path


def save_vtt(subtitles: list[AlignedSubtitle], output_path: Path, script: str = "native", lang_code: str = "") -> Path:
    """Save subtitles as VTT file."""
    if script == "roman":
        subtitles = _transliterate_subtitles(subtitles, lang_code)
        
    content = to_vtt(subtitles)
    output_path.write_text(content, encoding="utf-8")
    logger.info(f"VTT saved: {output_path}")
    return output_path


def save_ass(subtitles: list[AlignedSubtitle], output_path: Path, script: str = "native", lang_code: str = "", **kwargs) -> Path:
    """Save subtitles as ASS file."""
    if script == "roman":
        subtitles = _transliterate_subtitles(subtitles, lang_code)
        # For Roman script, we don't need RTL and we can use a standard font
        kwargs["is_rtl"] = False
        kwargs["font_name"] = "Noto Sans"
        
    content = to_ass(subtitles, **kwargs)
    output_path.write_text(content, encoding="utf-8")
    logger.info(f"ASS saved: {output_path}")
    return output_path

