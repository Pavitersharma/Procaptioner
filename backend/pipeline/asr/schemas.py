from dataclasses import dataclass, field

@dataclass
class WordSegment:
    """A single word with precise timing."""
    word: str
    start: float  # seconds
    end: float    # seconds
    probability: float = 1.0
    roman_word: str = ""


@dataclass
class TranscriptionSegment:
    """A subtitle segment (usually 1-2 lines) with word-level detail."""
    id: int
    start: float       # seconds
    end: float         # seconds
    text: str
    words: list[WordSegment] = field(default_factory=list)


@dataclass
class TranscriptionResult:
    """Complete transcription output."""
    segments: list[TranscriptionSegment]
    language: str            # Detected or specified language code
    language_probability: float
    duration: float          # Audio duration in seconds
    provider: str = "whisper" # The provider that generated this result
    model: str = "default"
    metadata: dict = field(default_factory=dict) # E.g., cost, request info
