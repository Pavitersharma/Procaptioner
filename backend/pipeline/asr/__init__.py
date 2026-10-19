from abc import ABC, abstractmethod
from pathlib import Path
from .schemas import TranscriptionResult

class ASRProvider(ABC):
    @abstractmethod
    def transcribe(
        self,
        audio_path: Path,
        language: str | None = None,
        model_name: str | None = None,
        word_timestamps: bool = True,
        vad_filter: bool = True,
        initial_prompt: str | None = None,
        on_progress: callable = None,
        keyterms: list[str] | None = None,
    ) -> TranscriptionResult:
        """Transcribe an audio file and return a normalized TranscriptionResult."""
        pass

    @abstractmethod
    def unload(self):
        """Unload models if necessary to free resources."""
        pass

def get_asr_provider(provider_name: str) -> ASRProvider:
    if provider_name == "deepgram":
        from .deepgram_provider import DeepgramProvider
        return DeepgramProvider()
    else:
        raise ValueError(f"Unknown ASR provider: {provider_name}")
