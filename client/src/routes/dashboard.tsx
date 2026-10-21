import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Sparkles,
  Languages,
  FileVideo,
  Check,
  ArrowRight,
  Loader2,
  X,
  Undo2,
  Redo2,
  PanelLeftOpen,
  PanelRightOpen,
  Zap,
  Play,
  Clock,
  Trash2,
  Save,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { cn } from "@/lib/utils";
import { EditorProvider, loadSavedEditorPrefs, useEditor, type CaptionStyle } from "@/lib/editor-store";
import { SidebarPanel } from "@/components/editor/sidebar-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import { InspectorPanel } from "@/components/editor/inspector-panel";
import { TimelinePanel } from "@/components/editor/timeline-panel";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";
import { NotFoundComponent } from "@/components/not-found";
import { CREATOR_PRO_FEATURES } from "@/components/vyra/pricing";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useUsage, formatBytes, formatMinutes, validateUploadQuota } from "@/lib/usage";
import { uploadVideoToStorage } from "@/lib/storage";
import { UpgradeModal } from "@/components/payment/upgrade-modal";
import {
  saveProjectRecord,
  deleteProjectRecord,
  normalizeProject,
  type SavedProject,
} from "@/lib/projects";

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

const API_BASE = "http://localhost:8000";

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
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProCaptioner" },
      {
        name: "description",
        content: "Your ProCaptioner workspace — manage projects, upload footage, and track usage.",
      },
    ],
  }),
  component: DashboardPage,
});

export function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPageContent />
    </ProtectedRoute>
  );
}

function DashboardPageContent() {
  const { user } = useAuth();
  const { usage, refreshUsage } = useUsage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentUploadMetaRef = useRef<{
    fileSize: number;
    storagePath: string | null;
    videoUrl: string | null;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Editor flow state — all phases run in the dashboard
  const [phase, setPhase] = useState<"dashboard" | "processing" | "editor">("dashboard");
  const [job, setJob] = useState<JobState | null>(null);
  const [hasError, setHasError] = useState(false);
  const [languages, setLanguages] = useState<LanguagesByRegion>({});
  const [selectedTargetLang, setSelectedTargetLang] = useState("");
  const [script, setScript] = useState<"native" | "roman">("native");
  const [isTranslating, setIsTranslating] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Upload state
  const [sourceLang, setSourceLang] = useState("auto");
  const [burnIn, setBurnIn] = useState(false);

  // Language modal state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [modalSourceLang, setModalSourceLang] = useState("auto");
  const [modalBurnIn, setModalBurnIn] = useState(false);
  const [modalScript, setModalScript] = useState<"native" | "roman">("native");
  const [isUploading, setIsUploading] = useState(false);

  // Video player
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSubIndex, setActiveSubIndex] = useState(-1);

  // Active template selected from /templates box view
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // Upgrade Plan modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── Load saved projects from Supabase ──
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);

      if (!error && data) {
        setProjects((data as Record<string, unknown>[]).map(normalizeProject));
      }
    } catch (err) {
      console.warn("Could not load projects from Supabase:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("procaptioner_active_template");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name) setActiveTemplateName(parsed.name);
      }
    } catch {}
  }, []);

  // ── Load languages on mount ──
  useEffect(() => {
    fetch(`${API_BASE}/api/languages`)
      .then((r) => r.json())
      .then(setLanguages)
      .catch(() => {});
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

        // Auto-persist project to Supabase if logged in
        if (user) {
          let activeTemplateStyle: Record<string, unknown> = {};
          try {
            const stored = localStorage.getItem("procaptioner_active_template");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.style) activeTemplateStyle = { ...parsed.style, stylePreset: parsed.name };
            }
          } catch {}

          const meta = currentUploadMetaRef.current;

          saveProjectRecord({
            userId: user.id,
            jobId: data.job_id,
            filename: data.filename || "Untitled Project",
            duration: data.duration || 0,
            language: data.detected_language || "auto",
            subtitles: data.subtitles || [],
            captionStyle: activeTemplateStyle,
            fileSize: meta?.fileSize || 0,
            storagePath: meta?.storagePath || null,
            videoUrl: meta?.videoUrl || null,
            status: "completed",
          }).then((saved) => {
            if (saved) {
              loadProjects();
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
  }, [job?.job_id, phase, user, loadProjects, refreshUsage]);

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
      setShowUpgradeModal(true);
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

    // Upload video file directly to Supabase Storage in user's isolated folder
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

  // ── Back to dashboard handler ──
  const handleBackToDashboard = () => {
    setPhase("dashboard");
    setJob(null);
    setHasError(false);
    setPendingFile(null);
    setShowLanguageModal(false);
  };

  // ── Open saved project in editor ──
  const handleOpenProject = (proj: SavedProject) => {
    const reconstructedJob: JobState = {
      job_id: proj.job_id,
      filename: proj.filename || proj.name,
      status: "completed",
      progress: 1.0,
      message: "Completed",
      error: null,
      detected_language: proj.language,
      language_confidence: 1.0,
      segment_count: proj.subtitles?.length || 0,
      word_count:
        proj.subtitles?.reduce((acc, s) => acc + (s.words?.length || 0), 0) || 0,
      duration: proj.duration || 0,
      has_video: true,
      has_srt: true,
      has_vtt: true,
      has_burned_video: false,
      subtitles: proj.subtitles,
    };

    if (proj.caption_style) {
      (reconstructedJob as unknown as Record<string, unknown>)["caption_style"] =
        proj.caption_style;
    }
    if (proj.video_url) {
      (reconstructedJob as unknown as Record<string, unknown>)["video_url"] =
        proj.video_url;
    }

    setJob(reconstructedJob);
    setPhase("editor");
  };

  // ── Delete saved project ──
  const handleDeleteProject = async (e: React.MouseEvent, proj: SavedProject) => {
    e.stopPropagation();
    const title = proj.title || proj.name || proj.filename || "Untitled Project";
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const ok = await deleteProjectRecord(proj);
      if (ok) {
        setProjects((prev) => prev.filter((p) => p.id !== proj.id));
        await refreshUsage();
      }
    } catch (err) {
      console.warn("Failed to delete project:", err);
    }
  };

  // ── Error state ──
  if (hasError || job?.status === "failed") {
    return (
      <DashboardLayout activeTab="home">
        <NotFoundComponent
          title="Something went wrong"
          message="There was an error processing your video. Please try again."
          onRetry={() => {
            setHasError(false);
            setJob(null);
            setPhase("dashboard");
          }}
        />
      </DashboardLayout>
    );
  }

  // ── PROCESSING PHASE — show inside dashboard layout ──
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
      <DashboardLayout activeTab="home">
        <div className="mx-auto max-w-lg pt-8 sm:pt-16">
          <div className="rounded-2xl border border-neutral-800/80 bg-[#0d0d0d] overflow-hidden">
            {/* Header */}
            <div className="border-b border-neutral-800/60 px-5 py-4 sm:px-6">
              <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
                Processing
              </p>
              <p className="mt-1 truncate text-sm font-medium text-white">{job?.filename}</p>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-5 sm:px-6">
              <div className="flex justify-between font-mono text-[0.6rem] text-neutral-400">
                <span>{job?.message}</span>
                <span>{Math.round((job?.progress ?? 0) * 100)}%</span>
              </div>
              <div className="mt-2 flex h-2 gap-px rounded overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span
                    key={i}
                    className={`flex-1 transition-colors duration-300 ${
                      (i / 30) * 100 < (job?.progress ?? 0) * 100
                        ? "bg-[#ff7a00]"
                        : "bg-neutral-800"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stages */}
            <div className="p-5 space-y-2 sm:p-6">
              {stages.map((stage, i) => {
                const isDone = currentStageIdx > i;
                const isActive = stage.key === job?.status;

                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-xs transition-all ${
                      isActive
                        ? "border border-[#ff7a00]/30 bg-[#ff7a00]/5 text-[#ff7a00]"
                        : isDone
                          ? "text-neutral-400"
                          : "text-neutral-600"
                    }`}
                  >
                    <span className="text-base">{isDone ? "✅" : isActive ? stage.icon : "○"}</span>
                    <span className="tracking-[0.1em] uppercase">{stage.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff7a00]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            {job?.detected_language && (
              <div className="border-t border-neutral-800/60 px-5 py-4 sm:px-6">
                <dl className="grid grid-cols-3 gap-4 font-mono text-[0.65rem]">
                  <div>
                    <dt className="text-neutral-500 uppercase tracking-[0.14em]">Language</dt>
                    <dd className="mt-1 text-sm text-white">{job.detected_language}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 uppercase tracking-[0.14em]">Words</dt>
                    <dd className="mt-1 text-sm text-white">{job.word_count.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500 uppercase tracking-[0.14em]">Confidence</dt>
                    <dd className="mt-1 text-sm text-[#ff7a00]">
                      {(job.language_confidence * 100).toFixed(1)}%
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Cancel button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Cancel and go back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── EDITOR PHASE — full-screen editor within dashboard ──
  if (phase === "editor" && job) {
    const savedPrefs = loadSavedEditorPrefs(job.job_id);
    const baseSubtitles = (job.subtitles ?? []).map((s) => ({
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

    // If user pre-selected a template from the Templates box view
    let activeTemplateStyle: Record<string, unknown> = {};
    try {
      const stored = localStorage.getItem("procaptioner_active_template");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.style) {
          activeTemplateStyle = { ...parsed.style, stylePreset: parsed.name };
        }
      }
    } catch {}

    const initialEditorState = {
      jobId: job.job_id,
      filename: job.filename,
      subtitles:
        savedPrefs.subtitles && savedPrefs.subtitles.length > 0
          ? savedPrefs.subtitles
          : baseSubtitles,
      videoSrc:
        ((job as unknown as Record<string, unknown>)["video_url"] as string) ||
        `${API_BASE}/api/job/${job.job_id}/original-video`,
      duration: job.duration,
      hasSrt: job.has_srt,
      hasVtt: job.has_vtt,
      hasBurnedVideo: job.has_burned_video,
      detectedLanguage: job.detected_language ?? "",
      script: (savedPrefs.script ||
        ((job as unknown as Record<string, unknown>)["script"] as "native" | "roman" | undefined) ||
        script) as "native" | "roman",
      ...(Object.keys(activeTemplateStyle).length > 0
        ? { captionStyle: activeTemplateStyle as unknown as CaptionStyle }
        : {}),
      ...savedPrefs,
      ...((job as unknown as Record<string, unknown>)["caption_style"]
        ? { captionStyle: (job as unknown as Record<string, unknown>)["caption_style"] as CaptionStyle }
        : {}),
    };

    return (
      <EditorProvider initialState={initialEditorState}>
        <DashboardEditorLayout
          videoRef={videoRef}
          jobId={job.job_id}
          filename={job.filename}
          onBackToDashboard={handleBackToDashboard}
        />
      </EditorProvider>
    );
  }

  // ── DASHBOARD PHASE (default) — the normal dashboard view ──
  return (
    <DashboardLayout activeTab="home">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Active Selected Template Notice */}
        {activeTemplateName && (
          <div className="flex items-center justify-between rounded-xl border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 px-4 py-2.5">
            <div className="flex items-center gap-2 font-mono text-xs text-[#ff7a1a]">
              <Sparkles className="h-4 w-4" />
              <span>
                Active Template: <strong className="text-white underline">{activeTemplateName}</strong>
              </span>
            </div>
            <Link
              to="/templates"
              className="font-mono text-[0.65rem] text-[#ff7a1a] hover:underline uppercase tracking-wider"
            >
              Browse All Templates →
            </Link>
          </div>
        )}

        {/* ── Drop Footage Area ── */}
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
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-[#0d0d0d] px-6 py-14 text-center transition-all duration-200 cursor-pointer group ${
            dragOver
              ? "border-[#ff7a00] bg-[#ff7a00]/5 shadow-[0_0_40px_-10px_rgba(255,122,0,0.15)]"
              : "border-neutral-700/60 hover:border-neutral-500"
          }`}
        >
          {/* Upload icon */}
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
              dragOver
                ? "border-[#ff7a00]/40 bg-[#ff7a00]/10"
                : "border-neutral-800 bg-[#121212] group-hover:border-neutral-600"
            }`}
          >
            <Upload
              className={`h-6 w-6 transition-colors ${
                dragOver ? "text-[#ff7a00]" : "text-neutral-400 group-hover:text-neutral-200"
              }`}
            />
          </div>

          <h2 className="text-lg font-bold tracking-wide text-white uppercase">
            Drop Footage Here
          </h2>
          <p className="mt-2 font-mono text-[0.65rem] tracking-[0.18em] text-neutral-500 uppercase">
            MP4, MOV, WEBM or Audio — up to 5GB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* ── Plan / Storage / Transcription Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Plan */}
          <div className="rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-5">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
              Plan
            </p>
            <p className="mt-2 text-2xl font-bold text-white uppercase font-mono">{usage.plan}</p>
            <p className="mt-1.5 text-xs text-neutral-400">
              {usage.plan === "free"
                ? "Basic access with 5GB storage & 60m quota"
                : "Unlimited access & priority processing"}
            </p>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="mt-4 block w-full text-center rounded-lg border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 py-2 text-xs font-semibold text-[#ff7a1a] transition-all hover:bg-[#ff7a1a] hover:text-black cursor-pointer shadow-[0_0_15px_-4px_rgba(255,122,26,0.25)]"
            >
              {usage.plan === "free" ? "Upgrade to Creator Pro" : "Manage Subscription"}
            </button>
          </div>

          {/* Storage Used */}
          <div className="rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-5">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
              Storage Used
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {formatBytes(usage.storageUsedBytes)}
              </span>
              <span className="font-mono text-xs text-neutral-500">
                of {formatBytes(usage.storageLimitBytes)}
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-[#ff7a1a] rounded-full shadow-[0_0_8px_rgba(255,122,26,0.5)] transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      2,
                      Math.round(
                        (usage.storageUsedBytes / (usage.storageLimitBytes || 1)) * 100,
                      ),
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Transcription */}
          <div className="rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-5">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-neutral-500 uppercase">
              Transcription
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {formatMinutes(usage.transcriptionUsedSeconds)}
              </span>
              <span className="font-mono text-xs text-neutral-500">
                of {formatMinutes(usage.transcriptionLimitSeconds)} ({formatMinutes(usage.transcriptionRemainingSeconds)} left)
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-[#ff7a1a] rounded-full shadow-[0_0_8px_rgba(255,122,26,0.5)] transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      2,
                      Math.round(
                        (usage.transcriptionUsedSeconds /
                          (usage.transcriptionLimitSeconds || 1)) *
                          100,
                      ),
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Recent Projects ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
              {projects.length > 0 && (
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-[0.62rem] text-neutral-400 border border-neutral-700/50">
                  {projects.length}
                </span>
              )}
            </div>
            {projects.length > 0 && (
              <button
                type="button"
                onClick={loadProjects}
                className="text-xs text-[#ff7a1a] hover:underline cursor-pointer"
              >
                Refresh
              </button>
            )}
          </div>

          {loadingProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-4 animate-pulse space-y-3"
                >
                  <div className="h-24 w-full bg-neutral-800/60 rounded-lg" />
                  <div className="h-3 w-2/3 bg-neutral-800/80 rounded" />
                  <div className="h-2 w-1/3 bg-neutral-800/60 rounded" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800/80 bg-[#0d0d0d] px-6 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-[#121212] mb-4">
                <Sparkles className="h-5 w-5 text-neutral-500" />
              </div>
              <p className="text-lg font-bold tracking-tight text-white">No projects yet</p>
              <p className="mt-1.5 text-xs text-neutral-500 max-w-sm">
                {user
                  ? "Upload a clip above to create and automatically save your first project"
                  : "Sign in to save and sync your captioned projects to your personal cloud"}
              </p>
              {!user && (
                <Link
                  to="/signin"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 px-4 py-2 font-mono text-xs font-semibold text-[#ff7a1a] hover:bg-[#ff7a1a] hover:text-black transition-colors"
                >
                  Sign in to save projects →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className="group relative flex flex-col justify-between rounded-xl border border-neutral-800/80 bg-[#0d0d0d] p-4 transition-all duration-200 hover:border-[#ff7a1a]/50 hover:bg-[#121212] hover:shadow-[0_8px_30px_rgba(255,122,26,0.08)] cursor-pointer"
                >
                  {/* Top card preview */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-neutral-700">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                    <FileVideo className="h-10 w-10 text-neutral-600 group-hover:text-[#ff7a1a] transition-colors" />

                    {/* Play button hover badge */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="h-10 w-10 rounded-full bg-[#ff7a1a] text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                        <Play className="h-4 w-4 fill-black translate-x-0.5" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {proj.duration > 0 && (
                      <span className="absolute bottom-2 right-2 z-20 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[0.62rem] text-white/90 border border-white/10">
                        {formatDuration(proj.duration)}
                      </span>
                    )}

                    {/* Language pill */}
                    {proj.language && (
                      <span className="absolute top-2 left-2 z-20 rounded bg-neutral-900/90 px-1.5 py-0.5 font-mono text-[0.58rem] text-[#ff7a1a] uppercase tracking-wider border border-[#ff7a1a]/30">
                        {proj.language}
                      </span>
                    )}
                  </div>

                  {/* Card bottom metadata */}
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white group-hover:text-[#ff7a1a] transition-colors">
                        {proj.name || proj.filename}
                      </p>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[0.65rem] text-neutral-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(proj.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span>{proj.subtitles?.length || 0} cues</span>
                        {proj.file_size ? (
                          <>
                            <span>•</span>
                            <span>{formatBytes(proj.file_size)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProject(e, proj)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors rounded hover:bg-neutral-800"
                      title="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Source Language Selection & Confirmation Modal ── */}
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
      {/* ── Creator Pro Upgrade Modal (Razorpay) ── */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </DashboardLayout>
  );
}

// ─── DashboardEditorLayout — full-screen editor rendered within dashboard ─────
interface DashboardEditorLayoutProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  jobId: string;
  filename: string;
  onBackToDashboard: () => void;
}

function DashboardEditorLayout({
  videoRef,
  jobId,
  filename,
  onBackToDashboard,
}: DashboardEditorLayoutProps) {
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
        {/* Left: Logo + back button + mobile sidebar toggle + filename */}
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
          <button
            type="button"
            onClick={onBackToDashboard}
            className="hidden font-mono text-[0.6rem] tracking-[0.14em] text-white/50 uppercase transition-colors hover:text-white sm:inline cursor-pointer"
            title="Back to Dashboard"
          >
            ← Dashboard
          </button>
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
              type="button"
              onClick={handleSaveProject}
              disabled={isSaving}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm",
                savedSuccess
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-[#ff7a1a]/15 text-[#ff7a1a] border border-[#ff7a1a]/30 hover:bg-[#ff7a1a] hover:text-black",
              )}
              title="Save project changes to personal cloud"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : savedSuccess ? (
                <Check className="h-3 w-3" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              <span>{savedSuccess ? "Saved" : isSaving ? "Saving..." : "Save"}</span>
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
