"""
ProCaptioner Pipeline — Subtitle Aligner
Groups word-level timestamps into natural subtitle segments.
Handles line-breaking, duration limits, and multi-line formatting.
"""

import logging
from dataclasses import dataclass, field

from config import MAX_CHARS_PER_LINE, MAX_LINES_PER_SUB, MIN_SUBTITLE_DURATION_MS, MAX_SUBTITLE_DURATION_MS
from pipeline.transcriber import TranscriptionResult, TranscriptionSegment, WordSegment

logger = logging.getLogger(__name__)


@dataclass
class AlignedSubtitle:
    """A single subtitle entry ready for formatting."""
    index: int
    start: float     # seconds
    end: float        # seconds
    lines: list[str]  # 1 or 2 lines of text
    words: list[WordSegment] = field(default_factory=list)


def align_subtitles(
    result: TranscriptionResult,
    max_chars_per_line: int = MAX_CHARS_PER_LINE,
    max_lines: int = MAX_LINES_PER_SUB,
    min_duration_ms: int = MIN_SUBTITLE_DURATION_MS,
    max_duration_ms: int = MAX_SUBTITLE_DURATION_MS,
    merge_short_gaps: bool = True,
    gap_threshold_ms: int = 300,
) -> list[AlignedSubtitle]:
    """
    Take raw transcription segments and produce clean subtitle entries.

    Strategy:
    1. Flatten all words from all segments into a continuous word stream.
    2. Group words into subtitle blocks based on:
       - Character count per line (max_chars_per_line)
       - Maximum lines per subtitle (max_lines)
       - Natural pause boundaries (gaps between words)
       - Duration limits
    3. Split long segments into multiple subtitles.
    4. Merge very short segments with neighbors.

    Args:
        result: TranscriptionResult from the transcriber.
        max_chars_per_line: Max characters per subtitle line.
        max_lines: Max lines per subtitle (usually 2).
        min_duration_ms: Minimum subtitle display time.
        max_duration_ms: Maximum subtitle display time.
        merge_short_gaps: Whether to merge words across small gaps.
        gap_threshold_ms: Gap size to consider a natural break.

    Returns:
        List of AlignedSubtitle objects ready for formatting.
    """
    # Step 1: Flatten all words
    all_words: list[WordSegment] = []
    for seg in result.segments:
        if seg.words:
            all_words.extend(seg.words)
        else:
            # If no word-level timestamps, create a single word from the segment
            all_words.append(WordSegment(
                word=seg.text,
                start=seg.start,
                end=seg.end,
                probability=1.0,
            ))

    if not all_words:
        return []

    # Step 2: Group words into subtitle blocks
    subtitles: list[AlignedSubtitle] = []
    current_words: list[WordSegment] = []
    current_text = ""

    max_total_chars = max_chars_per_line * max_lines

    for i, word in enumerate(all_words):
        test_text = (current_text + " " + word.word).strip() if current_text else word.word

        # Check if we should break here
        should_break = False

        # Break if adding this word exceeds character limit
        if len(test_text) > max_total_chars:
            should_break = True

        # Break if there's a significant pause before this word
        if current_words and not should_break:
            gap_ms = (word.start - current_words[-1].end) * 1000
            if gap_ms > gap_threshold_ms:
                should_break = True

        # Break if duration would exceed max
        if current_words and not should_break:
            duration_ms = (word.end - current_words[0].start) * 1000
            if duration_ms > max_duration_ms:
                should_break = True

        if should_break and current_words:
            # Finalize current subtitle
            sub = _create_subtitle(len(subtitles) + 1, current_words, max_chars_per_line)
            subtitles.append(sub)
            current_words = []
            current_text = ""

        current_words.append(word)
        current_text = (current_text + " " + word.word).strip() if current_text else word.word

    # Finalize last subtitle
    if current_words:
        sub = _create_subtitle(len(subtitles) + 1, current_words, max_chars_per_line)
        subtitles.append(sub)

    # Step 3: Enforce minimum duration
    for sub in subtitles:
        duration_ms = (sub.end - sub.start) * 1000
        if duration_ms < min_duration_ms:
            sub.end = sub.start + min_duration_ms / 1000

    # Step 4: Merge very short subtitles (single words) with neighbors
    if merge_short_gaps:
        subtitles = _merge_short_subtitles(subtitles, min_words=2)

    # Re-index
    for i, sub in enumerate(subtitles):
        sub.index = i + 1

    logger.info(f"Alignment complete: {len(subtitles)} subtitle entries from {len(all_words)} words.")
    return subtitles


def _create_subtitle(
    index: int,
    words: list[WordSegment],
    max_chars_per_line: int,
) -> AlignedSubtitle:
    """Create a subtitle entry from a list of words, splitting into lines."""
    full_text = " ".join(w.word for w in words)

    # Split into lines
    lines = _split_into_lines(full_text, max_chars_per_line)

    return AlignedSubtitle(
        index=index,
        start=words[0].start,
        end=words[-1].end,
        lines=lines,
        words=list(words),
    )


def _split_into_lines(text: str, max_chars: int) -> list[str]:
    """
    Split text into balanced lines, each under max_chars.
    Tries to break at natural points (spaces, punctuation).
    """
    if len(text) <= max_chars:
        return [text]

    words = text.split()
    if len(words) <= 1:
        return [text]

    # Try to split roughly in half by word count
    mid = len(words) // 2

    # Find the best split point near the middle
    best_split = mid
    best_balance = float("inf")

    for i in range(max(1, mid - 3), min(len(words), mid + 4)):
        line1 = " ".join(words[:i])
        line2 = " ".join(words[i:])

        if len(line1) > max_chars or len(line2) > max_chars:
            continue

        balance = abs(len(line1) - len(line2))
        if balance < best_balance:
            best_balance = balance
            best_split = i

    line1 = " ".join(words[:best_split])
    line2 = " ".join(words[best_split:])

    result = []
    if line1:
        result.append(line1)
    if line2:
        result.append(line2)

    return result if result else [text]


def _merge_short_subtitles(
    subtitles: list[AlignedSubtitle],
    min_words: int = 2,
) -> list[AlignedSubtitle]:
    """Merge subtitles that have fewer than min_words with their neighbor."""
    if len(subtitles) <= 1:
        return subtitles

    merged: list[AlignedSubtitle] = []

    i = 0
    while i < len(subtitles):
        current = subtitles[i]

        # If current has very few words and there's a next subtitle
        if len(current.words) < min_words and i + 1 < len(subtitles):
            nxt = subtitles[i + 1]
            gap_ms = (nxt.start - current.end) * 1000

            # Only merge if gap is small
            if gap_ms < 1000:
                combined_words = current.words + nxt.words
                combined_text = " ".join(w.word for w in combined_words)
                lines = _split_into_lines(combined_text, MAX_CHARS_PER_LINE)

                merged.append(AlignedSubtitle(
                    index=len(merged) + 1,
                    start=current.start,
                    end=nxt.end,
                    lines=lines,
                    words=combined_words,
                ))
                i += 2
                continue

        merged.append(current)
        i += 1

    return merged
