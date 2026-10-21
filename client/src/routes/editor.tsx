import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Undo2,
  Redo2,
  PanelLeftOpen,
  PanelRightOpen,
  X,
  Languages,
  FileVideo,
  Check,
  ArrowRight,
  Loader2,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/vyra/language-selector";
import { EditorProvider, loadSavedEditorPrefs, useEditor, type CaptionStyle } from "@/lib/editor-store";
import { SidebarPanel } from "@/components/editor/sidebar-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import { InspectorPanel } from "@/components/editor/inspector-panel";
import { TimelinePanel } from "@/components/editor/timeline-panel";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";
import { NotFoundComponent } from "@/components/not-found";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUsage, validateUploadQuota } from "@/lib/usage";
import { uploadVideoToStorage } from "@/lib/storage";
import { saveProjectRecord } from "@/lib/projects";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WordInfo {
  word: string;
  roman_word?: string;
  start: number;
  end: number;
  confidence: number;
}

interface SubtitleEntry {
  index: number;
  start: number;
  end: number;
  text: string;
  roman_text?: string;
  words: WordInfo[];
}

interface JobState {
  job_id: string;
  filename: string;
  status: string;
  progress: number;
  message: string;
  error: string | null;
  detected_language: string | null;
  language_confidence: number;
  segment_count: number;
  word_count: number;
  duration: number;
  has_video: boolean;
  has_srt: boolean;
  has_vtt: boolean;
  has_burned_video: boolean;
  subtitles: SubtitleEntry[] | null;
}

interface LanguageInfo {
  code: string;
  name: string;
  native_name: string;
  script: string;
  engine: string;
  direction: string;
}

type LanguagesByRegion = Record<string, LanguageInfo[]>;

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

const POPULAR_SOURCE_LANGUAGES = [
  { code: "auto", name: "Auto-detect", native: "✨ Auto" },
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ar", name: "Arabic", native: "العربية" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "ProCaptioner Editor — Subtitle Studio" },
      {
        name: "description",
        content: "Upload, transcribe, translate, and burn subtitles into your videos.",
      },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  return (
    <ProtectedRoute>
      <EditorPageContent />
    </ProtectedRoute>
  );
}

function EditorPageContent() {
  const { user } = useAuth();
  const { usage, refreshUsage } = useUsage();
  const currentUploadMetaRef = useRef<{
    fileSize: number;
    storagePath: string | null;
    videoUrl: string | null;
  } | null>(null);
  const [phase, setPhase] = useState<"upload" | "processing" | "editor">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("job_id")) return "processing";
    }
    return "upload";
  });
  const [job, setJob] = useState<JobState | null>(null);
  const [hasError, setHasError] = useState(false);
  const [languages, setLanguages] = useState<LanguagesByRegion>({});
  const [selectedTargetLang, setSelectedTargetLang] = useState("");
  const [script, setScript] = useState<"native" | "roman">("native");
  const [isTranslating, setIsTranslating] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [burnIn, setBurnIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Source Language selection popup state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [modalSourceLang, setModalSourceLang] = useState("auto");
  const [modalBurnIn, setModalBurnIn] = useState(false);
  const [modalScript, setModalScript] = useState<"native" | "roman">("native");
  const [isUploading, setIsUploading] = useState(false);

  // Video player
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSubIndex, setActiveSubIndex] = useState(-1);

  // ── Check backend & load languages ──
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    fetch(`${API_BASE}/api/languages`)
      .then((r) => r.json())
      .then(setLanguages)
      .catch(() => {});

    // Check URL parameters for existing job or demo mode
    const params = new URLSearchParams(window.location.search);
    const qJobId = params.get("job_id");
    if (qJobId) {
      fetch(`${API_BASE}/api/job/${qJobId}/status`)
        .then((r) => {
          if (!r.ok) throw new Error("Job not found");
          return r.json();
        })
        .then((data: JobState) => {
          if (data && data.status === "completed") {
            setJob(data);
            setPhase("editor");
          } else if (data && data.status === "failed") {
            setHasError(true);
          }
        })
        .catch(() => {
          setHasError(true);
        });
    } else if (params.get("demo") === "true" || params.get("demo") === "1") {
      setJob({
        job_id: "demo",
        filename: "demo_video.mp4",
        status: "completed",
        progress: 1.0,
        message: "Ready",
        error: null,
        detected_language: "en",
        language_confidence: 0.99,
        segment_count: 4,
        word_count: 24,
        duration: 15.0,
        has_video: false,
        has_srt: true,
        has_vtt: true,
        has_burned_video: false,
        subtitles: [
          {
            index: 1,
            start: 0.0,
            end: 3.5,
            text: "Welcome to ProCaptioner studio captions",
            roman_text: "Welcome to ProCaptioner studio captions",
            words: [
              { word: "Welcome", start: 0.0, end: 0.8, confidence: 0.98 },
              { word: "to", start: 0.8, end: 1.2, confidence: 0.99 },
              { word: "ProCaptioner", start: 1.2, end: 2.0, confidence: 0.99 },
              { word: "studio", start: 2.0, end: 2.7, confidence: 0.97 },
              { word: "captions", start: 2.7, end: 3.5, confidence: 0.98 },
            ],
          },
          {
            index: 2,
            start: 3.5,
            end: 7.0,
            text: "Pick from 20 built-in templates",
            roman_text: "Pick from 20 built-in templates",
            words: [
              { word: "Pick", start: 3.5, end: 4.2, confidence: 0.99 },
              { word: "from", start: 4.2, end: 4.8, confidence: 0.98 },
              { word: "20", start: 4.8, end: 5.4, confidence: 0.99 },
              { word: "built-in", start: 5.4, end: 6.2, confidence: 0.97 },
              { word: "templates", start: 6.2, end: 7.0, confidence: 0.98 },
            ],
          },
          {
            index: 3,
            start: 7.0,
            end: 11.0,
            text: "Full customization and video export",
            roman_text: "Full customization and video export",
            words: [
              { word: "Full", start: 7.0, end: 7.8, confidence: 0.98 },
              { word: "customization", start: 7.8, end: 9.0, confidence: 0.99 },
              { word: "and", start: 9.0, end: 9.6, confidence: 0.97 },
              { word: "video", start: 9.6, end: 10.2, confidence: 0.98 },
              { word: "export", start: 10.2, end: 11.0, confidence: 0.99 },
            ],
          },
        ],
      });
      setPhase("editor");
    }
  }, []);

  // ── SSE for job progress ──
  useEffect(() => {
    if (!job?.job_id || phase !== "processing") return;

    const es = new EventSource(`${API_BASE}/api/job/${job.job_id}/events`);
    es.onmessage = (e) => {
      const data: JobState = JSON.parse(e.data);
      setJob(data);
      if (data.status === "completed") {
        setPhase("editor");
        es.close();

        // Auto-save project to Supabase if logged in
        if (user) {
          const meta = currentUploadMetaRef.current;
          saveProjectRecord({
            userId: user.id,
            jobId: data.job_id,
            filename: data.filename || "Untitled Project",
            duration: data.duration || 0,
            language: data.detected_language || "auto",
            subtitles: data.subtitles || [],
            fileSize: meta?.fileSize || 0,
            storagePath: meta?.storagePath || null,
            videoUrl: meta?.videoUrl || null,
            status: "completed",
          }).then((saved) => {
            if (saved) {
              refreshUsage();
            }
          });
        }
      }
      if (data.status === "failed" || data.error) {
        setHasError(true);
        es.close();
      }
    };
    es.onerror = (err) => {
      console.error("SSE Error:", err);
      setHasError(true);
      es.close();
    };
    return () => es.close();
  }, [job?.job_id, phase, user, refreshUsage]);

  // ── Track video time for subtitle highlighting ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [phase]);

  // ── Find active subtitle ──
  useEffect(() => {
    if (!job?.subtitles) return;
    const idx = job.subtitles.findIndex((s) => currentTime >= s.start && currentTime <= s.end);
    setActiveSubIndex(idx);
  }, [currentTime, job?.subtitles]);

  // ── Upload handler ──
  const handleUpload = useCallback(
    async (
      file: File,
      options?: {
        sourceLang?: string;
        targetLang?: string;
        burnIn?: boolean;
        script?: "native" | "roman";
      },
    ) => {
      const activeSource = options?.sourceLang ?? sourceLang;
      const activeTarget = options?.targetLang ?? selectedTargetLang;
      const activeBurnIn = options?.burnIn ?? burnIn;
      const activeScript = options?.script ?? script;

      const form = new FormData();
      form.append("video", file);
      form.append("source_lang", activeSource);
      form.append("target_lang", activeTarget);
      form.append("burn_in", String(activeBurnIn));
      form.append("script", activeScript);

      try {
        const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form });
        if (!res.ok) {
          setHasError(true);
          return;
        }
        const data = await res.json();
        if (data.status === "failed" || data.error) {
          setHasError(true);
          return;
        }
        setJob({ ...data, filename: file.name, subtitles: null } as JobState);
        setPhase("processing");
      } catch (err) {
        console.error("Upload failed:", err);
        setHasError(true);
      }
    },
    [sourceLang, selectedTargetLang, burnIn, script],
  );

  // ── File select & modal trigger ──
  const onFileSelect = (file: File) => {
    const quota = validateUploadQuota(file, usage);
    if (!quota.valid) {
      alert(quota.reason);
      return;
    }
    setPendingFile(file);
    setModalSourceLang(sourceLang || "auto");
    setModalBurnIn(burnIn);
    setModalScript(script);
    setShowLanguageModal(true);
  };

  const handleProceedGeneration = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    setSourceLang(modalSourceLang);
    setBurnIn(modalBurnIn);
    setScript(modalScript);

    // Upload video directly to Supabase Storage
    let storageData: { storagePath: string; videoUrl: string } | null = null;
    if (user) {
      try {
        storageData = await uploadVideoToStorage(pendingFile, user.id);
      } catch (storageErr) {
        console.warn("Supabase storage upload error:", storageErr);
      }
    }

    currentUploadMetaRef.current = {
      fileSize: pendingFile.size,
      storagePath: storageData?.storagePath || null,
      videoUrl: storageData?.videoUrl || null,
    };

    await handleUpload(pendingFile, {
      sourceLang: modalSourceLang,
      burnIn: modalBurnIn,
      script: modalScript,
    });
    setIsUploading(false);
    setShowLanguageModal(false);
    setPendingFile(null);
  };

  const handleCancelModal = () => {
    if (isUploading) return;
    setShowLanguageModal(false);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!showLanguageModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUploading) {
        handleCancelModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLanguageModal, isUploading]);

  // ── Translate handler ──
  const handleTranslate = useCallback(async () => {
    if (!job?.job_id || !selectedTargetLang) return;
    setIsTranslating(true);

    try {
      const res = await fetch(`${API_BASE}/api/job/${job.job_id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_lang: selectedTargetLang, burn_in: burnIn, script }),
      });
      if (!res.ok) {
        setHasError(true);
        return;
      }
      // Re-enter processing to listen for SSE
      setPhase("processing");
    } catch (err) {
      console.error("Translation failed:", err);
      setHasError(true);
    } finally {
      setIsTranslating(false);
    }
  }, [job?.job_id, selectedTargetLang, burnIn, script]);

  // ── Seek to subtitle ──
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // Backend offline warning
  if (backendOnline === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-8">
        <div className="max-w-lg border border-border bg-surface-0 p-8 text-center">
          <p className="text-display text-2xl">Backend Offline</p>
          <p className="mt-4 text-muted-foreground">
            The ProCaptioner subtitle engine is not running. Start it with:
          </p>
          <code className="mt-4 block border border-border bg-surface-1 px-4 py-3 font-mono text-sm text-accent">
            cd backend && py main.py
          </code>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 border border-accent px-6 py-2 font-mono text-xs tracking-[0.14em] uppercase text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── 404 NOT FOUND (shown when an issue occurs while generating subtitles/job) ──
  if (hasError || job?.status === "failed") {
    return (
      <NotFoundComponent
        title="Page not found"
        message="The page you're looking for doesn't exist or has been moved."
        onRetry={() => {
          setHasError(false);
          setJob(null);
          setPhase("upload");
          window.history.replaceState({}, "", "/editor");
        }}
      />
    );
  }

  // ── UPLOAD PHASE ──
  if (phase === "upload") {
    return (
      <div className="min-h-dvh bg-background">
        {/* Minimal nav */}
        <nav className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="font-mono text-sm tracking-[0.18em] text-foreground uppercase transition-opacity hover:opacity-80"
            >
              ProCaptioner
            </Link>
            <span className="text-muted-foreground/30 text-xs hidden sm:inline">|</span>
            <span className="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase hidden sm:inline">
              Subtitle Studio
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </nav>

        <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-5 md:py-24">
          <h1 className="text-display text-[clamp(2rem,5vw,3.5rem)]">
            Add subtitles to your <span className="text-accent">video.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Upload a video and get AI-powered subtitles in 70+ languages — transcription,
            translation, and burn-in. All local, all free.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) onFileSelect(file);
            }}
            className="mt-8 grid min-h-[12rem] place-items-center border border-dashed transition-all duration-300 sm:mt-10 sm:min-h-[16rem]"
            style={{
              borderColor: dragOver ? "var(--accent)" : "var(--border)",
              background: dragOver
                ? "color-mix(in oklab, var(--accent) 6%, var(--surface-0))"
                : "var(--surface-0)",
            }}
          >
            <div className="p-5 text-center sm:p-8">
              <p className="text-display text-xl">
                {dragOver ? "Release to configure language." : "Drop your video here"}
              </p>
              <p className="label-mono mt-3">MP4, MOV, WebM, MKV, AVI — up to 2GB</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 border border-accent px-6 py-2.5 font-mono text-xs tracking-[0.14em] uppercase text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Choose a file
              </button>
              <div className="mt-4 flex items-center justify-center">
                <a
                  href="/editor?demo=true"
                  className="font-mono text-[0.65rem] text-accent/80 hover:text-accent underline tracking-wider uppercase transition-colors"
                >
                  Or open editor with sample captions →
                </a>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelect(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-px border border-border bg-border sm:mt-8">
            {/* Source language */}
            <div className="bg-surface-0 p-4 sm:p-5">
              <p className="label-mono mb-3">Source language</p>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full border border-border bg-surface-1 px-3 py-2 font-mono text-xs text-foreground"
              >
                <option value="auto">Auto-detect</option>
                {Object.entries(languages).map(([region, langs]) => (
                  <optgroup key={region} label={region}>
                    {langs.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.native_name})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Burn-in toggle */}
            <div className="bg-surface-0 p-4 sm:p-5">
              <p className="label-mono mb-3">Burn into video</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${burnIn ? "bg-accent" : "bg-surface-3"}`}
                  onClick={() => setBurnIn(!burnIn)}
                >
                  <div
                    className={`h-5 w-5 rounded-full border border-border bg-white transition-transform ${burnIn ? "translate-x-4" : "translate-x-0"}`}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {burnIn
                    ? "Yes — subtitles embedded in video"
                    : "No — download SRT/VTT files only"}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 sm:mt-12 sm:pt-12">
            <LanguageSelector
              selectedLang={selectedTargetLang}
              onSelectLang={setSelectedTargetLang}
              script={script}
              onSelectScript={setScript}
            />
          </div>
        </div>

        {/* ── Source Language Selection & Confirmation Modal Popup ── */}
        {showLanguageModal && pendingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => !isUploading && handleCancelModal()} />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.14] bg-[#111113] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-5 sm:p-7 z-10 space-y-5 animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff6600]/30 bg-[#ff6600]/10 text-[#ff6600]">
                    <Languages className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm sm:text-base font-bold tracking-wider text-white uppercase">
                      Select Source Language
                    </h3>
                    <p className="text-xs text-white/50">What language is spoken in your video?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelModal}
                  disabled={isUploading}
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Selected File Card */}
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff6600]/10 text-[#ff6600]">
                  <FileVideo className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-medium text-white">
                    {pendingFile.name}
                  </p>
                  <p className="font-mono text-[0.62rem] text-white/40">
                    {(pendingFile.size / (1024 * 1024)).toFixed(1)} MB • Video ready for subtitles
                  </p>
                </div>
              </div>

              {/* Popular Languages Quick Select */}
              <div className="space-y-2">
                <label className="block font-mono text-[0.65rem] tracking-[0.16em] text-white/60 uppercase">
                  Quick Select Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 max-h-[170px] overflow-y-auto pr-1">
                  {POPULAR_SOURCE_LANGUAGES.map((lang) => {
                    const isSelected = modalSourceLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setModalSourceLang(lang.code)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left font-mono text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#ff6600] bg-[#ff6600]/15 text-[#ff6600] font-semibold ring-1 ring-[#ff6600]/40"
                            : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <span className="truncate">
                          {lang.name}
                          {lang.native && lang.native !== lang.name ? ` (${lang.native})` : ""}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#ff6600]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* All Languages Dropdown */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[0.65rem] tracking-[0.16em] text-white/60 uppercase">
                  Or Browse All 70+ Languages
                </label>
                <select
                  value={modalSourceLang}
                  onChange={(e) => setModalSourceLang(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.12] bg-[#18181a] px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-[#ff6600] transition-colors"
                >
                  <option value="auto">✨ Auto-detect language</option>
                  {Object.entries(languages).map(([region, langs]) => (
                    <optgroup key={region} label={region} className="bg-[#141416]">
                      {langs.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}{" "}
                          {l.native_name && l.native_name !== l.name ? `(${l.native_name})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Output Preferences: Burn-in & Script */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
                {/* Burn-in switch */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-medium text-white">
                      Burn Subtitles into Video
                    </p>
                    <p className="text-[0.65rem] text-white/40">
                      {modalBurnIn
                        ? "Embed captions directly on the video footage"
                        : "Generate SRT & VTT subtitle files only"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalBurnIn((v) => !v)}
                    className={`h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer relative ${
                      modalBurnIn ? "bg-[#ff6600]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                        modalBurnIn ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Script option if Indian language */}
                {(modalSourceLang === "hi" ||
                  modalSourceLang === "mr" ||
                  modalSourceLang === "bn" ||
                  modalSourceLang === "ta" ||
                  modalSourceLang === "te") && (
                  <div className="border-t border-white/[0.08] pt-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs text-white/70">Script Format:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModalScript("native")}
                        className={`px-2.5 py-1 rounded font-mono text-[0.62rem] uppercase transition-colors cursor-pointer ${
                          modalScript === "native"
                            ? "bg-[#ff6600]/20 text-[#ff6600] border border-[#ff6600]/40 font-bold"
                            : "text-white/40 hover:text-white"
                        }`}
                      >
                        Native Script
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalScript("roman")}
                        className={`px-2.5 py-1 rounded font-mono text-[0.62rem] uppercase transition-colors cursor-pointer ${
                          modalScript === "roman"
                            ? "bg-[#ff6600]/20 text-[#ff6600] border border-[#ff6600]/40 font-bold"
                            : "text-white/40 hover:text-white"
                        }`}
                      >
                        Roman (Hinglish)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  disabled={isUploading}
                  className="rounded-lg border border-white/[0.12] bg-transparent px-4 py-2.5 font-mono text-xs tracking-wider text-white/60 uppercase transition-colors hover:bg-white/[0.05] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedGeneration}
                  disabled={isUploading}
                  className="flex items-center gap-2 rounded-lg bg-[#ff6600] px-5 py-2.5 font-mono text-xs font-bold tracking-[0.14em] text-black uppercase transition-all hover:bg-[#ff771a] active:scale-[0.98] shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Starting Engine...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Generate</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PROCESSING PHASE ──
  if (phase === "processing") {
    const stages = [
      { key: "extracting_audio", label: "Extracting Audio", icon: "🎵" },
      { key: "transcribing", label: "Transcribing Speech", icon: "🗣️" },
      { key: "aligning", label: "Aligning Words", icon: "⏱️" },
      { key: "translating", label: "Translating", icon: "🌐" },
      { key: "formatting", label: "Generating Subtitles", icon: "📝" },
      { key: "burning", label: "Burning into Video", icon: "🎬" },
    ];

    const currentStageIdx = stages.findIndex((s) => s.key === job?.status);

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-lg border border-border bg-surface-0">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Processing
            </p>
            <p className="mt-1 truncate text-sm text-foreground">{job?.filename}</p>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex justify-between font-mono text-[0.6rem] text-muted-foreground">
              <span>{job?.message}</span>
              <span>{Math.round((job?.progress ?? 0) * 100)}%</span>
            </div>
            <div className="mt-2 flex h-2 gap-px">
              {Array.from({ length: 30 }).map((_, i) => (
                <span
                  key={i}
                  className={`flex-1 transition-colors duration-300 ${
                    (i / 30) * 100 < (job?.progress ?? 0) * 100 ? "bg-accent" : "bg-surface-3"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Stages */}
          <div className="p-4 space-y-2 sm:p-6 sm:space-y-3">
            {stages.map((stage, i) => {
              const isDone = currentStageIdx > i;
              const isActive = stage.key === job?.status;
              const isPending = currentStageIdx < i;

              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 px-3 py-2 font-mono text-xs transition-all ${
                    isActive
                      ? "border border-accent/30 bg-accent/5 text-accent"
                      : isDone
                        ? "text-foreground/60"
                        : "text-muted-foreground/40"
                  }`}
                >
                  <span className="text-base">{isDone ? "✅" : isActive ? stage.icon : "○"}</span>
                  <span className="tracking-[0.1em] uppercase">{stage.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          {job?.detected_language && (
            <div className="border-t border-border px-4 py-3 sm:px-6 sm:py-4">
              <dl className="grid grid-cols-3 gap-2 font-mono text-[0.6rem] sm:gap-4 sm:text-[0.65rem]">
                <div>
                  <dt className="text-muted-foreground uppercase tracking-[0.14em]">Language</dt>
                  <dd className="mt-1 text-sm text-foreground">{job.detected_language}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground uppercase tracking-[0.14em]">Words</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {job.word_count.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground uppercase tracking-[0.14em]">Confidence</dt>
                  <dd className="mt-1 text-sm text-accent">
                    {(job.language_confidence * 100).toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── EDITOR PHASE ──
  // Build initial editor state from completed job (preferring saved project state)
  const savedPrefs = loadSavedEditorPrefs(job?.job_id);
  const baseSubtitles = (job!.subtitles ?? []).map((s) => ({
    index: s.index,
    start: s.start,
    end: s.end,
    text: s.text,
    ...(s.roman_text !== undefined ? { roman_text: s.roman_text } : {}),
    words: (s.words || []).map((w) => ({
      word: w.word,
      ...(w.roman_word !== undefined ? { roman_word: w.roman_word } : {}),
      start: w.start,
      end: w.end,
      confidence: w.confidence ?? 1.0,
    })),
  }));

  const initialEditorState = {
    jobId: job!.job_id,
    filename: job!.filename,
    subtitles:
      savedPrefs.subtitles && savedPrefs.subtitles.length > 0
        ? savedPrefs.subtitles
        : baseSubtitles,
    videoSrc: `${API_BASE}/api/job/${job!.job_id}/original-video`,
    duration: job!.duration,
    hasSrt: job!.has_srt,
    hasVtt: job!.has_vtt,
    hasBurnedVideo: job!.has_burned_video,
    detectedLanguage: job!.detected_language ?? "",
    script: (savedPrefs.script || ((job as unknown as Record<string, unknown>)["script"] as "native" | "roman" | undefined) || script) as
      "native" | "roman",
    ...savedPrefs,
    ...((job as unknown as Record<string, unknown>)["caption_style"]
      ? { captionStyle: (job as unknown as Record<string, unknown>)["caption_style"] as CaptionStyle }
      : {}),
  };

  return (
    <EditorProvider initialState={initialEditorState}>
      <EditorLayout videoRef={videoRef} jobId={job!.job_id} filename={job!.filename} />
    </EditorProvider>
  );
}

// ─── EditorLayout — inner component that reads from EditorProvider ─────────────

interface EditorLayoutProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  jobId: string;
  filename: string;
}

function EditorLayout({ videoRef, jobId, filename }: EditorLayoutProps) {
  const { state, dispatch, canUndo, canRedo } = useEditor();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProject = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const ok = await saveProjectRecord({
        userId: user.id,
        jobId,
        filename,
        duration: state.duration,
        language: state.detectedLanguage || "auto",
        subtitles: state.subtitles,
        captionStyle: state.captionStyle as Record<string, unknown>,
        videoUrl: state.videoSrc || null,
        status: "completed",
      });
      if (ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (e) {
      console.warn("Failed to save project:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Mobile drawer state ──
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [mobileInspector, setMobileInspector] = useState(false);

  // Close drawers on resize to desktop
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setMobileSidebar(false);
        setMobileInspector(false);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close drawers on Escape
  useEffect(() => {
    if (!mobileSidebar && !mobileInspector) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileSidebar(false);
        setMobileInspector(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileSidebar, mobileInspector]);

  // ── Seek helper ──
  const seekTo = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        videoRef.current.play();
        dispatch({ type: "SET_PLAYING", payload: true });
      }
    },
    [videoRef, dispatch],
  );

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      const v = videoRef.current;

      switch (e.key) {
        case " ":
          e.preventDefault();
          document.getElementById("editor-play-pause")?.click();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (v) v.currentTime = Math.max(0, v.currentTime - (e.shiftKey ? 10 : 2));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (v) v.currentTime = Math.min(state.duration, v.currentTime + (e.shiftKey ? 10 : 2));
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
          }
          break;
        case "y":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: "REDO" });
          }
          break;
        case "Escape":
          setMobileSidebar(false);
          setMobileInspector(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [videoRef, state.duration, dispatch]);

  return (
    <div className="flex h-dvh flex-col bg-[#0d0d0d]" style={{ colorScheme: "dark" }}>
      {/* ── Top Header ── */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] bg-[#0a0a0a] px-2 py-2 sm:px-4">
        {/* Left: Logo + mobile sidebar toggle + filename */}
        <div className="flex items-center gap-2 min-w-0 sm:gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => {
              setMobileSidebar((v) => !v);
              setMobileInspector(false);
            }}
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded transition-colors lg:hidden",
              mobileSidebar
                ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                : "text-white/50 hover:text-white/80",
            )}
            title="Toggle Captions Panel"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className="shrink-0 transition-opacity hover:opacity-85"
            aria-label="ProCaptioner Home"
          >
            <ProCaptionerLogo size="sm" variant="responsive" theme="dark" />
          </Link>
          <span className="hidden text-white/[0.12] sm:inline">|</span>
          <Link
            to="/dashboard"
            className="hidden font-mono text-[0.6rem] tracking-[0.14em] text-white/50 uppercase transition-colors hover:text-white sm:inline"
            title="Dashboard"
          >
            Dashboard
          </Link>
          <span className="hidden text-white/[0.12] sm:inline">|</span>
          <span className="hidden max-w-[160px] truncate font-mono text-[0.62rem] text-white/40 sm:inline lg:max-w-[220px]">
            {filename}
          </span>
        </div>

        {/* Center: Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: "UNDO" })}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="grid h-7 w-7 place-items-center rounded text-white/35 transition-colors hover:text-white/80 disabled:opacity-20"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => dispatch({ type: "REDO" })}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="grid h-7 w-7 place-items-center rounded text-white/35 transition-colors hover:text-white/80 disabled:opacity-20"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Save Project & Mobile inspector toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && (
            <button
              onClick={handleSaveProject}
              disabled={isSaving}
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded border border-white/[0.12] bg-white/[0.04] px-2.5 py-1 font-mono text-[0.62rem] text-white/70 transition-all hover:bg-white/[0.08] hover:text-white cursor-pointer",
                savedSuccess && "border-green-500/40 bg-green-500/10 text-green-400",
              )}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin text-white/60" />
              ) : savedSuccess ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Film className="h-3 w-3 text-white/60" />
              )}
              <span>{savedSuccess ? "Saved to Cloud" : "Save Project"}</span>
            </button>
          )}

          <button
            onClick={() => {
              setMobileInspector((v) => !v);
              setMobileSidebar(false);
            }}
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded transition-colors lg:hidden",
              mobileInspector
                ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                : "text-white/50 hover:text-white/80",
            )}
            title="Toggle Inspector Panel"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Middle: main area with responsive panels ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ── Left Sidebar — visible on lg+, slide-over on mobile ── */}
        <div className="hidden w-[300px] shrink-0 flex-col overflow-hidden lg:flex">
          <SidebarPanel onSeek={seekTo} />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileSidebar(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,340px)] flex-col bg-[#111111] shadow-2xl lg:hidden animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
                <span className="font-mono text-[0.62rem] tracking-wider text-white/60 uppercase">
                  Captions
                </span>
                <button
                  onClick={() => setMobileSidebar(false)}
                  className="grid h-7 w-7 place-items-center rounded text-white/40 hover:text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarPanel
                  onSeek={(t) => {
                    seekTo(t);
                    setMobileSidebar(false);
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Center Canvas — flexible, full-width on mobile ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <CanvasPanel videoRef={videoRef} />
        </div>

        {/* ── Right Inspector — visible on lg+, slide-over on mobile ── */}
        <div className="hidden w-[260px] shrink-0 flex-col overflow-hidden lg:flex">
          <InspectorPanel />
        </div>

        {/* Mobile inspector overlay */}
        {mobileInspector && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileInspector(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 flex w-[min(85vw,320px)] flex-col bg-[#111111] shadow-2xl lg:hidden animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
                <span className="font-mono text-[0.62rem] tracking-wider text-white/60 uppercase">
                  Inspector
                </span>
                <button
                  onClick={() => setMobileInspector(false)}
                  className="grid h-7 w-7 place-items-center rounded text-white/40 hover:text-white/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <InspectorPanel />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom Timeline ── */}
      <TimelinePanel onSeek={seekTo} />
    </div>
  );
}
