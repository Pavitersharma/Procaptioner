"""
ProCaptioner Subtitle Engine — FastAPI Application
Main API server that orchestrates the full subtitle pipeline:
Upload → Extract Audio → Transcribe → Align → Translate → Format → Burn-in
"""

import asyncio
import json
import logging
import shutil
import time
import uuid
from enum import Enum
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from config import (
    API_HOST, API_PORT, CORS_ORIGINS, UPLOAD_DIR, OUTPUT_DIR,
    ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB
)
from languages import (
    ALL_LANGUAGES, get_language, get_languages_by_region,
    get_translation_languages, TranslationEngine,
)

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("procaptioner")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ProCaptioner Subtitle Engine",
    description="Local GPU-powered multilingual subtitle generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Job State ────────────────────────────────────────────────────────────────
class JobStatus(str, Enum):
    QUEUED = "queued"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    ALIGNING = "aligning"
    TRANSLATING = "translating"
    FORMATTING = "formatting"
    BURNING = "burning"
    COMPLETED = "completed"
    FAILED = "failed"


class JobState:
    def __init__(self, job_id: str, filename: str):
        self.job_id = job_id
        self.filename = filename
        self.status: JobStatus = JobStatus.QUEUED
        self.progress: float = 0.0  # 0.0 - 1.0
        self.message: str = "Queued"
        self.error: str | None = None
        self.created_at: float = time.time()

        # Paths
        self.video_path: Path | None = None
        self.audio_path: Path | None = None
        self.srt_path: Path | None = None
        self.vtt_path: Path | None = None
        self.ass_path: Path | None = None
        self.burned_video_path: Path | None = None

        # Results
        self.detected_language: str | None = None
        self.language_confidence: float = 0.0
        self.segment_count: int = 0
        self.word_count: int = 0
        self.duration: float = 0.0
        self.subtitles_json: list[dict] | None = None
        self.caption_style: dict | None = None
        self.script: str = "native"
        self.asr_provider: str | None = None
        self.asr_model: str | None = None
        self.asr_metadata: dict = {}

        # SSE subscribers
        self.subscribers: list[asyncio.Queue] = []

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "filename": self.filename,
            "status": self.status.value,
            "progress": round(self.progress, 2),
            "message": self.message,
            "error": self.error,
            "detected_language": self.detected_language,
            "language_confidence": round(self.language_confidence, 2),
            "segment_count": self.segment_count,
            "word_count": self.word_count,
            "duration": round(self.duration, 1),
            "has_video": self.video_path is not None and self.video_path.exists(),
            "has_srt": self.srt_path is not None and self.srt_path.exists(),
            "has_vtt": self.vtt_path is not None and self.vtt_path.exists(),
            "has_burned_video": self.burned_video_path is not None and self.burned_video_path.exists(),
            "subtitles": self.subtitles_json,
            "caption_style": self.caption_style,
            "script": self.script,
            "asr_provider": self.asr_provider,
            "asr_model": self.asr_model,
            "asr_metadata": self.asr_metadata,
        }

    async def update(self, status: JobStatus, progress: float, message: str):
        self.status = status
        self.progress = progress
        self.message = message
        # Notify all SSE subscribers
        event_data = json.dumps(self.to_dict())
        for q in self.subscribers:
            await q.put(event_data)


# In-memory job store
jobs: dict[str, JobState] = {}


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class SaveProjectRequest(BaseModel):
    caption_style: dict | None = None
    subtitles: list[dict] | None = None
    script: str = "native"


class TranslateRequest(BaseModel):
    target_lang: str
    burn_in: bool = False
    script: str = "native"


class ExportStyleRequest(BaseModel):
    caption_style: dict
    subtitles: list[dict] | None = None
    script: str = "native"


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    region: str
    script: str
    engine: str


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/languages")
async def list_languages():
    """Return all supported languages grouped by region."""
    regions = get_languages_by_region()
    result = {}
    for region, langs in regions.items():
        result[region] = [
            {
                "code": l.code,
                "name": l.name,
                "native_name": l.native_name,
                "script": l.script,
                "engine": l.translation_engine.value,
                "direction": l.direction.value,
            }
            for l in langs
        ]
    return result


@app.post("/api/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    source_lang: str = Form(default="auto"),
    target_lang: str = Form(default=""),
    burn_in: bool = Form(default=False),
    script: str = Form(default="native"),
    keyterms: str = Form(default=""),
):
    """
    Upload a video file and start the subtitle generation pipeline.
    Returns a job_id for tracking progress.
    """
    # Validate file extension
    ext = Path(video.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Create job
    job_id = str(uuid.uuid4())[:8]
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded file
    video_path = job_dir / f"input{ext}"
    with open(video_path, "wb") as f:
        while chunk := await video.read(1024 * 1024):  # 1MB chunks
            f.write(chunk)

    # Create job state
    job = JobState(job_id, video.filename)
    job.video_path = video_path
    jobs[job_id] = job

    # Start processing in background
    background_tasks.add_task(
        _run_pipeline,
        job,
        source_lang=source_lang if source_lang != "auto" else None,
        target_lang=target_lang if target_lang else None,
        burn_in=burn_in,
        script=script,
        keyterms=[k.strip() for k in keyterms.split(",") if k.strip()] if keyterms else None,
    )

    return {"job_id": job_id, "status": "queued"}


@app.post("/api/job/{job_id}/save")
async def save_job_project(job_id: str, req: SaveProjectRequest):
    """Save editor settings, custom templates, and edited subtitles."""
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    project_file = job_dir / "project.json"

    data = {
        "caption_style": req.caption_style,
        "subtitles": req.subtitles,
        "script": req.script,
        "saved_at": time.time(),
    }
    project_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    job = jobs.get(job_id)
    if job:
        if req.caption_style:
            job.caption_style = req.caption_style
        if req.subtitles:
            job.subtitles_json = req.subtitles
        job.script = req.script

    return {"status": "saved"}


@app.get("/api/job/{job_id}/status")
async def job_status(job_id: str):
    """Get current job status, reconstructing from disk if needed."""
    job = jobs.get(job_id)
    job_dir = OUTPUT_DIR / job_id

    # If job not in memory but directory exists on disk, reconstruct state
    if not job and job_dir.exists():
        input_files = list(job_dir.glob("input.*"))
        if input_files:
            video_file = input_files[0]
            job = JobState(job_id, video_file.name)
            job.video_path = video_file
            job.status = JobStatus.COMPLETED
            job.progress = 1.0
            job.message = "Loaded from storage"

            srt = job_dir / "subtitles.srt"
            if srt.exists():
                job.srt_path = srt
            vtt = job_dir / "subtitles.vtt"
            if vtt.exists():
                job.vtt_path = vtt
            ass = job_dir / "subtitles.ass"
            if ass.exists():
                job.ass_path = ass
            burned = job_dir / "output_subtitled.mp4"
            if burned.exists():
                job.burned_video_path = burned

            # Try loading subtitles.json or parsing srt
            subs_file = job_dir / "subtitles.json"
            if subs_file.exists():
                try:
                    job.subtitles_json = json.loads(subs_file.read_text(encoding="utf-8"))
                except Exception:
                    pass

            jobs[job_id] = job

    if not job:
        raise HTTPException(404, "Job not found")

    # Load persistent project settings if saved
    project_file = job_dir / "project.json"
    if project_file.exists():
        try:
            pdata = json.loads(project_file.read_text(encoding="utf-8"))
            if pdata.get("caption_style"):
                job.caption_style = pdata["caption_style"]
            if pdata.get("subtitles"):
                job.subtitles_json = pdata["subtitles"]
            if pdata.get("script"):
                job.script = pdata["script"]
        except Exception as e:
            logger.warning(f"Failed to read project.json for {job_id}: {e}")

    return job.to_dict()


@app.get("/api/job/{job_id}/events")
async def job_events(job_id: str):
    """
    Server-Sent Events stream for real-time progress updates.
    Connect from frontend: new EventSource('/api/job/{id}/events')
    """
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    queue = asyncio.Queue()
    job.subscribers.append(queue)

    async def event_generator():
        try:
            # Send current state immediately
            yield f"data: {json.dumps(job.to_dict())}\n\n"

            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {data}\n\n"

                    # Check if job is done
                    parsed = json.loads(data)
                    if parsed["status"] in ("completed", "failed"):
                        break
                except asyncio.TimeoutError:
                    # Send a keep-alive ping
                    yield ": keep-alive\n\n"
        finally:
            job.subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.get("/api/job/{job_id}/subtitles/{format}")
async def download_subtitles(job_id: str, format: str):
    """Download subtitle file (srt, vtt, or ass)."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if format == "srt" and job.srt_path and job.srt_path.exists():
        return FileResponse(job.srt_path, filename=f"{job.filename}.srt", media_type="text/plain")
    elif format == "vtt" and job.vtt_path and job.vtt_path.exists():
        return FileResponse(job.vtt_path, filename=f"{job.filename}.vtt", media_type="text/vtt")
    elif format == "ass" and job.ass_path and job.ass_path.exists():
        return FileResponse(job.ass_path, filename=f"{job.filename}.ass", media_type="text/plain")
    else:
        raise HTTPException(404, f"Subtitle file ({format}) not found. Job may still be processing.")


@app.get("/api/job/{job_id}/original-video")
async def stream_original_video(job_id: str):
    """Stream the original uploaded video for preview in the editor."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if job.video_path and job.video_path.exists():
        return FileResponse(
            job.video_path,
            media_type="video/mp4",
        )
    raise HTTPException(404, "Original video not found.")


@app.get("/api/job/{job_id}/video")
async def download_video(job_id: str):
    """Download video with burned-in subtitles."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if job.burned_video_path and job.burned_video_path.exists():
        return FileResponse(
            job.burned_video_path,
            filename=f"{job.filename}_subtitled.mp4",
            media_type="video/mp4",
        )
    raise HTTPException(404, "Burned video not ready yet.")


@app.post("/api/job/{job_id}/export")
async def export_job_subtitles(job_id: str, req: ExportStyleRequest):
    """
    Burn subtitles into video using custom template/caption styling from the editor.
    Renders identical to preview window with smooth transitions and master quality.
    """
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if not job.video_path or not job.video_path.exists():
        raise HTTPException(400, "Original video not found for this job.")

    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Convert frontend subtitles (or job.subtitles_json)
    subs_data = req.subtitles if req.subtitles is not None else job.subtitles_json
    if not subs_data:
        raise HTTPException(400, "No subtitles available to burn.")

    # Save project settings immediately so they are permanently preserved
    project_file = job_dir / "project.json"
    project_file.write_text(json.dumps({
        "caption_style": req.caption_style,
        "subtitles": subs_data,
        "script": req.script,
        "exported_at": time.time(),
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    job.caption_style = req.caption_style
    job.subtitles_json = subs_data
    job.script = req.script

    # Generate ASS file alongside for user download if requested
    try:
        from pipeline.subtitle_formatter import caption_style_to_ass_params, to_ass, AlignedSubtitle
        aligned = []
        for s in subs_data:
            display_text = s.get("text", "")
            if req.script == "roman" and s.get("roman_text"):
                display_text = s["roman_text"]
            aligned.append(
                AlignedSubtitle(
                    index=s.get("index", len(aligned) + 1),
                    start=float(s.get("start", 0)),
                    end=float(s.get("end", 0)),
                    lines=[display_text],
                )
            )
        ass_params = caption_style_to_ass_params(req.caption_style)
        is_rtl = job.detected_language in ["ar", "ur", "he", "fa"]
        ass_content = to_ass(aligned, is_rtl=is_rtl, **ass_params)
        ass_path = job_dir / "subtitles.ass"
        ass_path.write_text(ass_content, encoding="utf-8")
        job.ass_path = ass_path
    except Exception as ass_err:
        logger.warning(f"Failed to generate ASS fallback file: {ass_err}")

    # Burn subtitles using exact template renderer
    await job.update(JobStatus.BURNING, 0.85, "Rendering high-quality template subtitles...")
    burned_path = job_dir / "output_subtitled.mp4"

    from pipeline.template_renderer import burn_template_subtitles
    try:
        await burn_template_subtitles(
            video_path=job.video_path,
            subtitles=subs_data,
            caption_style=req.caption_style,
            script=req.script,
            detected_lang=job.detected_language or "en",
            output_path=burned_path,
        )
    except Exception as e:
        logger.error(f"Template burn-in failed: {e}", exc_info=True)
        await job.update(JobStatus.FAILED, 1.0, f"Export failed: {str(e)}")
        raise HTTPException(500, f"Video export failed: {str(e)}")

    job.burned_video_path = burned_path
    job.has_burned_video = True
    await job.update(JobStatus.COMPLETED, 1.0, "Subtitles burned with template style successfully.")

    return {
        "status": "completed",
        "video_url": f"/api/job/{job_id}/video",
        "ass_url": f"/api/job/{job_id}/subtitles/ass",
    }


@app.post("/api/job/{job_id}/translate")
async def translate_job(job_id: str, req: TranslateRequest, background_tasks: BackgroundTasks):
    """Translate existing subtitles to a new language."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(400, "Job must be completed before translating.")

    if not job.subtitles_json:
        raise HTTPException(400, "No subtitles available to translate.")

    target = get_language(req.target_lang)
    if not target:
        raise HTTPException(400, f"Unknown target language: {req.target_lang}")

    # Start translation in background
    background_tasks.add_task(
        _run_translation,
        job,
        req.target_lang,
        req.burn_in,
        req.script,
    )

    return {"status": "translating", "target_lang": req.target_lang}


# ─── Background Pipeline ─────────────────────────────────────────────────────

async def _run_pipeline(
    job: JobState,
    source_lang: str | None = None,
    target_lang: str | None = None,
    burn_in: bool = False,
    script: str = "native",
    keyterms: list[str] | None = None,
):
    """Execute the full subtitle pipeline in background."""
    try:
        job_dir = job.video_path.parent
        loop = asyncio.get_event_loop()

        # ── Stage 1: Extract Audio ──
        await job.update(JobStatus.EXTRACTING_AUDIO, 0.05, "Extracting audio from video...")

        from pipeline.audio_extractor import extract_audio, probe_video

        video_info = await loop.run_in_executor(None, probe_video, job.video_path)
        job.duration = video_info["duration"]

        audio_path = job_dir / "audio.wav"
        await loop.run_in_executor(None, extract_audio, job.video_path, audio_path)
        job.audio_path = audio_path

        await job.update(JobStatus.EXTRACTING_AUDIO, 0.10, "Audio extracted successfully.")

        # ── Stage 2: Transcription ──
        await job.update(JobStatus.TRANSCRIBING, 0.15, "Transcribing speech (cloud)...")

        from pipeline.transcriber import transcribe

        transcription = await loop.run_in_executor(
            None,
            lambda: transcribe(
                audio_path,
                language=source_lang,
                on_progress=lambda idx, pct: None,  # Progress via SSE
                keyterms=keyterms,
            ),
        )

        job.detected_language = transcription.language
        job.language_confidence = transcription.language_probability
        job.segment_count = len(transcription.segments)
        job.word_count = sum(len(s.words) for s in transcription.segments)
        job.asr_provider = getattr(transcription, "provider", "unknown")
        job.asr_model = getattr(transcription, "model", "unknown")
        job.asr_metadata = getattr(transcription, "metadata", {})

        await job.update(
            JobStatus.TRANSCRIBING, 0.45,
            f"Speech recognized: {job.word_count} words in {transcription.language} "
            f"via {job.asr_provider}"
        )

        # ── Stage 2.5: LLM Post-Correction ──
        from config import GEMINI_API_KEY
        if GEMINI_API_KEY:
            await job.update(JobStatus.ALIGNING, 0.47, "Running LLM spelling correction...")

            from pipeline.llm_corrector import correct_transcript

            # Flatten all words for correction
            all_words = []
            for seg in transcription.segments:
                for w in seg.words:
                    all_words.append({
                        "word": w.word,
                        "start": w.start,
                        "end": w.end,
                        "confidence": w.probability,
                    })

            correction = await loop.run_in_executor(
                None,
                lambda: correct_transcript(all_words, transcription.language),
            )

            if correction:
                # Apply corrections back to transcription segments
                corrected_words = correction["corrected_words"]
                roman_words = correction["roman_words"]

                # Store both native and roman text on the job for the editor
                job.asr_metadata["roman_text"] = correction["roman_text"]
                job.asr_metadata["native_text"] = correction["native_text"]
                job.asr_metadata["roman_words"] = roman_words

                # Replace words in transcription segments with corrected words
                from pipeline.asr.schemas import WordSegment as WS
                word_idx = 0
                for seg in transcription.segments:
                    new_words = []
                    for _ in seg.words:
                        if word_idx < len(corrected_words):
                            cw = corrected_words[word_idx]
                            rw = roman_words[word_idx]
                            new_words.append(WS(
                                word=cw["word"],
                                start=cw["start"],
                                end=cw["end"],
                                probability=cw["confidence"],
                                roman_word=rw["word"]
                            ))
                            word_idx += 1
                    seg.words = new_words
                    seg.text = " ".join(w.word for w in new_words)

                await job.update(JobStatus.ALIGNING, 0.49, "LLM correction applied.")
                logger.info(f"[LLM] Correction applied to {len(corrected_words)} words.")
            else:
                logger.info("[LLM] Correction skipped (no result or word count mismatch).")

        # ── Stage 3: Alignment ──
        await job.update(JobStatus.ALIGNING, 0.50, "Aligning words to timeline...")

        from pipeline.aligner import align_subtitles

        aligned = await loop.run_in_executor(
            None,
            lambda: align_subtitles(transcription),
        )

        await job.update(JobStatus.ALIGNING, 0.55, f"Aligned {len(aligned)} subtitle entries.")

        # ── Stage 4: Translation (optional) ──
        if target_lang and target_lang != transcription.language:
            await job.update(JobStatus.TRANSLATING, 0.60, f"Translating to {target_lang}...")

            from pipeline.translator import translate_subtitles

            texts = ["\n".join(sub.lines) for sub in aligned]
            source_code = transcription.language

            translated_texts = await loop.run_in_executor(
                None,
                lambda: translate_subtitles(texts, source_code, target_lang),
            )

            # Update aligned subtitles with translations
            for sub, new_text in zip(aligned, translated_texts):
                sub.lines = new_text.split("\n")

            await job.update(JobStatus.TRANSLATING, 0.70, "Translation complete.")

        # ── Stage 5: Format Subtitles ──
        await job.update(JobStatus.FORMATTING, 0.75, "Generating subtitle files...")

        from pipeline.subtitle_formatter import save_srt, save_vtt, save_ass, to_json

        # Determine if RTL
        target_info = get_language(target_lang) if target_lang else get_language(transcription.language)
        is_rtl = target_info.direction.value == "rtl" if target_info else False
        font_name = target_info.font_family if target_info else "Noto Sans"

        # Get video dimensions for ASS
        video_width = video_info.get("width", 1920)
        video_height = video_info.get("height", 1080)

        srt_path = job_dir / "subtitles.srt"
        vtt_path = job_dir / "subtitles.vtt"
        ass_path = job_dir / "subtitles.ass"

        lang_code = target_lang if target_lang else transcription.language
        await loop.run_in_executor(None, save_srt, aligned, srt_path, script, lang_code)
        await loop.run_in_executor(None, save_vtt, aligned, vtt_path, script, lang_code)
        await loop.run_in_executor(
            None,
            lambda: save_ass(
                aligned, ass_path, script, lang_code,
                video_width=video_width,
                video_height=video_height,
                font_name=font_name,
                is_rtl=is_rtl,
            ),
        )

        job.srt_path = srt_path
        job.vtt_path = vtt_path
        job.ass_path = ass_path
        job.subtitles_json = to_json(aligned, lang_code)

        await job.update(JobStatus.FORMATTING, 0.85, "Subtitle files generated.")

        # ── Stage 6: Burn-in (optional) ──
        if burn_in:
            await job.update(JobStatus.BURNING, 0.88, "Burning subtitles into video...")

            from pipeline.burner import burn_subtitles

            burned_path = job_dir / "output_subtitled.mp4"
            await loop.run_in_executor(
                None,
                lambda: burn_subtitles(job.video_path, ass_path, burned_path),
            )
            job.burned_video_path = burned_path

            await job.update(JobStatus.BURNING, 0.95, "Video with burned subtitles ready.")

        # ── Done ──
        await job.update(JobStatus.COMPLETED, 1.0, "All done! Your subtitles are ready.")

    except Exception as e:
        logger.error(f"Pipeline failed for job {job.job_id}: {e}", exc_info=True)
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.message = f"Failed: {str(e)}"
        # Notify subscribers about failure
        event_data = json.dumps(job.to_dict())
        for q in job.subscribers:
            await q.put(event_data)


async def _run_translation(job: JobState, target_lang: str, burn_in: bool, script: str = "native"):
    """Run translation on an already-transcribed job."""
    try:
        loop = asyncio.get_event_loop()
        job_dir = job.video_path.parent

        await job.update(JobStatus.TRANSLATING, 0.10, f"Loading translation model for {target_lang}...")

        from pipeline.translator import translate_subtitles, unload_model as unload_translator
        from pipeline.aligner import AlignedSubtitle
        from pipeline.subtitle_formatter import save_srt, save_vtt, save_ass, to_json

        # Get texts from existing subtitles
        texts = [sub["text"] for sub in job.subtitles_json]
        source_lang = job.detected_language

        translated_texts = await loop.run_in_executor(
            None,
            lambda: translate_subtitles(texts, source_lang, target_lang),
        )

        # Unload translator
        await loop.run_in_executor(None, unload_translator)

        # Rebuild aligned subtitles with translations
        aligned: list[AlignedSubtitle] = []
        for i, (orig, trans) in enumerate(zip(job.subtitles_json, translated_texts)):
            from pipeline.transcriber import WordSegment
            aligned.append(AlignedSubtitle(
                index=i + 1,
                start=orig["start"],
                end=orig["end"],
                lines=trans.split("\n"),
                words=[WordSegment(w["word"], w["start"], w["end"], w.get("confidence", 1.0)) for w in orig.get("words", [])],
            ))

        # Re-generate subtitle files
        target_info = get_language(target_lang)
        is_rtl = target_info.direction.value == "rtl" if target_info else False
        font_name = target_info.font_family if target_info else "Noto Sans"

        from pipeline.audio_extractor import probe_video
        video_info = await loop.run_in_executor(None, probe_video, job.video_path)

        srt_path = job_dir / f"subtitles_{target_lang}.srt"
        vtt_path = job_dir / f"subtitles_{target_lang}.vtt"
        ass_path = job_dir / f"subtitles_{target_lang}.ass"

        await loop.run_in_executor(None, save_srt, aligned, srt_path, script, target_lang)
        await loop.run_in_executor(None, save_vtt, aligned, vtt_path, script, target_lang)
        await loop.run_in_executor(
            None,
            lambda: save_ass(
                aligned, ass_path, script, target_lang,
                video_width=video_info.get("width", 1920),
                video_height=video_info.get("height", 1080),
                font_name=font_name,
                is_rtl=is_rtl,
            ),
        )

        job.srt_path = srt_path
        job.vtt_path = vtt_path
        job.ass_path = ass_path
        job.subtitles_json = to_json(aligned)

        if burn_in:
            await job.update(JobStatus.BURNING, 0.80, "Burning translated subtitles...")
            from pipeline.burner import burn_subtitles

            burned_path = job_dir / f"output_{target_lang}.mp4"
            await loop.run_in_executor(
                None,
                lambda: burn_subtitles(job.video_path, ass_path, burned_path),
            )
            job.burned_video_path = burned_path

        await job.update(JobStatus.COMPLETED, 1.0, f"Translation to {target_lang} complete!")

    except Exception as e:
        logger.error(f"Translation failed: {e}", exc_info=True)
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.message = f"Translation failed: {str(e)}"
        event_data = json.dumps(job.to_dict())
        for q in job.subscribers:
            await q.put(event_data)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print(f"\nProCaptioner Subtitle Engine")
    print(f"   Languages: {len(ALL_LANGUAGES)}")
    print(f"   API: http://localhost:{API_PORT}\n")

    uvicorn.run(app, host=API_HOST, port=API_PORT)
