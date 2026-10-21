/**
 * ProCaptioner Editor — Main Canvas Panel
 * Shows: video player + live subtitle overlay + action bar + video controls
 */

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsage } from "@/lib/usage";
import { UpgradeModal } from "@/components/payment/upgrade-modal";
import {
  useEditor,
  captionStyleToCSS,
  getOverlayPosition,
  getActiveCaptionChunk,
} from "@/lib/editor-store";
import { PremiumSubtitleRenderer, VintageCorner } from "./premium-subtitle-renderer";

/**
 * Caption font sizes are authored against a virtual frame whose SHORT side is
 * this many px. The preview stage is scaled to the real on-screen video rect,
 * so a 32px caption is the same proportion of the frame for 16:9, 9:16 or 1:1.
 */
const REF_SHORT_SIDE = 480;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Subtitle Overlay ─────────────────────────────────────────────────────────

function SubtitleOverlay() {
  const { state } = useEditor();
  const { captionStyle, activeSubIndex, subtitles, currentTime, script } = state;

  const sub = activeSubIndex >= 0 && subtitles[activeSubIndex] ? subtitles[activeSubIndex] : null;
  if (!sub) return null;

  const chunk = getActiveCaptionChunk(sub, currentTime, captionStyle.wordsPerCaption ?? 3, script);
  if (chunk.words.length === 0) return null;

  const posStyle = getOverlayPosition(captionStyle);
  const textStyle = captionStyleToCSS(captionStyle);
  const isRTL = ["ar", "ur", "he", "fa"].includes(state.detectedLanguage);
  const justify =
    captionStyle.alignment === "left"
      ? "justify-start"
      : captionStyle.alignment === "right"
        ? "justify-end"
        : "justify-center";

  if (captionStyle.layoutPreset && captionStyle.layoutPreset !== "default") {
    return (
      <div
        className={cn("pointer-events-none absolute inset-x-0 flex px-[6%]", justify)}
        style={posStyle}
      >
        <div
          key={chunk.key}
          className="inline-block max-w-full animate-in fade-in zoom-in-95 duration-150"
        >
          <PremiumSubtitleRenderer
            layoutPreset={captionStyle.layoutPreset}
            captionStyle={captionStyle}
            words={chunk.words}
            isRTL={isRTL}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 flex px-[6%]", justify)}
      style={posStyle}
    >
      <div
        key={chunk.key}
        className="inline-block max-w-full animate-in fade-in zoom-in-95 duration-150"
        style={{ ...textStyle, direction: isRTL ? "rtl" : "ltr", overflowWrap: "break-word" }}
      >
        <div className={cn("flex flex-wrap items-center gap-x-[0.28em] gap-y-[0.1em]", justify)}>
          {chunk.words.map((w, wi) => {
            const isCurrentWord = w.active;

            let wordCustomStyle: React.CSSProperties = {};
            let extraContent: React.ReactNode = null;

            if (isCurrentWord) {
              wordCustomStyle = {
                color: captionStyle.highlightColor,
                fontWeight: Math.min(900, captionStyle.fontWeight + 100),
              };

              if (captionStyle.accentStyle === "glow-word") {
                wordCustomStyle.textShadow = `0 0 20px ${captionStyle.highlightColor}, 0 0 40px ${captionStyle.highlightColor}`;
              } else if (captionStyle.accentStyle === "script") {
                wordCustomStyle.fontFamily = `"${captionStyle.secondaryFontFamily || "Caveat"}", cursive, sans-serif`;
                wordCustomStyle.fontSize = "1.25em";
                wordCustomStyle.color =
                  captionStyle.secondaryTextColor || captionStyle.highlightColor;
              } else if (captionStyle.accentStyle === "circle-oval") {
                wordCustomStyle.border = `2px solid ${captionStyle.highlightColor}`;
                wordCustomStyle.borderRadius = "9999px";
                wordCustomStyle.padding = "1px 8px";
              }
            }

            if (captionStyle.stylePreset === "Goa" && isCurrentWord) {
              extraContent = (
                <svg
                  viewBox="0 0 100 20"
                  className="absolute -bottom-2.5 left-0 right-0 h-3 w-full text-emerald-400 opacity-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M5,12 Q25,2 45,12 T85,12 T95,6" />
                </svg>
              );
            }

            return (
              <span
                key={wi}
                className="relative inline-block max-w-full transition-transform duration-75"
                style={wordCustomStyle}
              >
                {w.text}
                {extraContent}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Action Bar (above video) ─────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

function ActionBar() {
  const { state, dispatch } = useEditor();
  const { jobId, hasSrt, hasVtt, hasBurnedVideo, captionStyle, subtitles, script } = state;
  const { usage } = useUsage();
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleExport = async () => {
    if (!jobId || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/job/${jobId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption_style: captionStyle,
          subtitles: subtitles.map((s) => ({
            index: s.index,
            start: s.start,
            end: s.end,
            text: s.text,
            roman_text: s.roman_text,
            words: s.words || [],
          })),
          script,
        }),
      });

      if (res.ok) {
        dispatch({ type: "INIT", payload: { hasBurnedVideo: true } });
        // Automatically trigger download of exported video
        window.location.href = `${API_BASE}/api/job/${jobId}/video`;
      } else {
        console.error("Export failed:", await res.text());
      }
    } catch (err) {
      console.error("Export request failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-1 border-b border-white/[0.07] bg-[#0c0c0c] px-2 py-1.5 sm:px-3">
        <div className="hidden items-center gap-1.5 sm:flex">
          <ActionBtn label="REPLACE" />
          <ActionBtn label="SAFE ZONE" />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1 sm:ml-0 sm:gap-1.5">
          {usage.plan === "free" && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1 border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-2 py-1 font-mono text-[0.52rem] font-semibold tracking-[0.12em] text-amber-400 uppercase transition-all hover:border-amber-400 hover:bg-amber-500/25 sm:px-2.5 sm:text-[0.58rem]"
              title="Upgrade to Creator Pro for Watermark-free 4K exports and unlimited storage"
            >
              <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>UPGRADE PRO</span>
            </button>
          )}
          {hasSrt && (
            <a
              href={`${API_BASE}/api/job/${jobId}/subtitles/srt`}
              className="border border-white/[0.12] px-2 py-1 font-mono text-[0.52rem] tracking-[0.12em] text-white/50 uppercase transition-colors hover:border-accent/60 hover:text-accent sm:px-2.5 sm:text-[0.58rem]"
            >
              ↓ SRT
            </a>
          )}
          {hasVtt && (
            <a
              href={`${API_BASE}/api/job/${jobId}/subtitles/vtt`}
              className="border border-white/[0.12] px-2 py-1 font-mono text-[0.52rem] tracking-[0.12em] text-white/50 uppercase transition-colors hover:border-accent/60 hover:text-accent sm:px-2.5 sm:text-[0.58rem]"
            >
              ↓ VTT
            </a>
          )}
          {jobId && (
            <a
              href={`${API_BASE}/api/job/${jobId}/subtitles/ass`}
              className="border border-white/[0.12] px-2 py-1 font-mono text-[0.52rem] tracking-[0.12em] text-white/50 uppercase transition-colors hover:border-accent/60 hover:text-accent sm:px-2.5 sm:text-[0.58rem]"
              title="Download styled ASS subtitles"
            >
              ↓ ASS
            </a>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-1 border px-2 py-1 font-mono text-[0.52rem] tracking-[0.12em] uppercase transition-all sm:px-3 sm:text-[0.58rem]",
              hasBurnedVideo
                ? "border-accent bg-accent text-accent-foreground hover:opacity-90"
                : "border-accent/60 bg-accent/20 text-accent hover:bg-accent hover:text-accent-foreground",
              isExporting && "opacity-50 cursor-wait",
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">BURNING...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : hasBurnedVideo ? (
              "↓ EXPORT"
            ) : (
              "EXPORT"
            )}
          </button>
        </div>
      </div>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}

function ActionBtn({ label }: { label: string }) {
  return (
    <button className="border border-white/[0.10] px-2.5 py-1 font-mono text-[0.58rem] tracking-[0.1em] text-white/40 uppercase transition-colors hover:border-white/25 hover:text-white/70">
      {label}
    </button>
  );
}

// ─── Video Controls ───────────────────────────────────────────────────────────

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

function VideoControls({ videoRef }: VideoControlsProps) {
  const { state, dispatch } = useEditor();
  const { currentTime, duration, isPlaying } = state;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      dispatch({ type: "SET_PLAYING", payload: false });
    } else {
      v.play();
      dispatch({ type: "SET_PLAYING", payload: true });
    }
  }, [isPlaying, videoRef, dispatch]);

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + delta));
  };

  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    dispatch({ type: "SET_CURRENT_TIME", payload: t });
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="border-t border-white/[0.07] bg-[#0c0c0c] px-2 py-1.5 sm:px-3 sm:py-2">
      {/* Progress bar */}
      <div className="relative mb-1.5 h-1 cursor-pointer rounded-full bg-white/[0.12] sm:mb-2">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={seekTo}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => skip(-5)}
          className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center text-white/40 transition-colors hover:text-white/80"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        <button
          id="editor-play-pause"
          onClick={togglePlay}
          className="grid h-8 w-8 sm:h-7 sm:w-7 place-items-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-90"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-[1px]" />
          )}
        </button>

        <button
          onClick={() => skip(5)}
          className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center text-white/40 transition-colors hover:text-white/80"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        <VolumeControl videoRef={videoRef} />

        <span className="ml-auto font-mono text-[0.52rem] tabular-nums text-white/45 sm:text-[0.6rem]">
          {fmtTime(currentTime)}&nbsp;/&nbsp;{fmtTime(duration)}
        </span>

        <button
          onClick={() => videoRef.current?.requestFullscreen()}
          className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center text-white/30 transition-colors hover:text-white/70"
        >
          <Maximize2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        </button>
      </div>
    </div>
  );
}

function VolumeControl({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const muted = videoRef.current?.muted ?? false;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  return (
    <button
      onClick={toggleMute}
      className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center text-white/40 transition-colors hover:text-white/80"
    >
      {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Canvas Panel ─────────────────────────────────────────────────────────────

interface CanvasPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function CanvasPanel({ videoRef }: CanvasPanelProps) {
  const { state, dispatch } = useEditor();
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 });
  const [videoDims, setVideoDims] = useState({ w: 1920, h: 1080 });

  // Track the available preview area size
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setAreaSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track the video's intrinsic resolution (portrait / landscape / square)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth && v.videoHeight) setVideoDims({ w: v.videoWidth, h: v.videoHeight });
    };
    onMeta();
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("resize", onMeta);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("resize", onMeta);
    };
  }, [videoRef, state.videoSrc]);

  // Rect the video actually occupies inside the area (object-contain math)
  const fit =
    areaSize.w && areaSize.h ? Math.min(areaSize.w / videoDims.w, areaSize.h / videoDims.h) : 0;
  const frameW = videoDims.w * fit;
  const frameH = videoDims.h * fit;
  const frameLeft = (areaSize.w - frameW) / 2;
  const frameTop = (areaSize.h - frameH) / 2;
  // Scale the caption stage so font sizes are proportional to the frame
  const stageScale = fit ? Math.min(frameW, frameH) / REF_SHORT_SIDE : 1;

  // Sync video events → editor state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let rafId: number;
    const loop = () => {
      if (!v.paused && !v.ended) {
        dispatch({ type: "SET_CURRENT_TIME", payload: v.currentTime });
        rafId = requestAnimationFrame(loop);
      }
    };

    const onPlay = () => {
      dispatch({ type: "SET_PLAYING", payload: true });
      rafId = requestAnimationFrame(loop);
    };
    const onPause = () => {
      dispatch({ type: "SET_PLAYING", payload: false });
      dispatch({ type: "SET_CURRENT_TIME", payload: v.currentTime });
      cancelAnimationFrame(rafId);
    };
    const onEnded = () => {
      dispatch({ type: "SET_PLAYING", payload: false });
      dispatch({ type: "SET_CURRENT_TIME", payload: v.currentTime });
      cancelAnimationFrame(rafId);
    };
    const onTime = () => {
      if (v.paused) {
        dispatch({ type: "SET_CURRENT_TIME", payload: v.currentTime });
      }
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(rafId);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [videoRef, dispatch]);

  // Sync activeSubIndex from currentTime
  useEffect(() => {
    const subs = state.subtitles;
    if (!subs.length) return;
    const idx = subs.findIndex((s) => state.currentTime >= s.start && state.currentTime <= s.end);
    if (idx !== state.activeSubIndex) {
      dispatch({ type: "SET_ACTIVE_SUB", payload: idx });
    }
  }, [state.currentTime, state.subtitles, state.activeSubIndex, dispatch]);

  return (
    <div className="flex h-full flex-col bg-black">
      <ActionBar />

      {/* Video area */}
      <div ref={areaRef} className="relative flex-1 overflow-hidden bg-black">
        {/* Checkerboard empty state */}
        {!state.videoSrc && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "repeating-conic-gradient(#888 0% 25%, transparent 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          />
        )}

        {state.videoSrc && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-contain"
            preload="metadata"
          >
            <source src={state.videoSrc} />
          </video>
        )}

        {/* Resolution badge */}
        <div className="pointer-events-none absolute top-2 left-3 font-mono text-[0.55rem] tracking-[0.18em] text-white/25 uppercase">
          Program · {videoDims.w}×{videoDims.h}
        </div>

        {/* Caption stage — clipped to the real video frame and scaled to it */}
        {fit > 0 && (
          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{ left: frameLeft, top: frameTop, width: frameW, height: frameH }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                width: frameW / stageScale,
                height: frameH / stageScale,
                transform: `scale(${stageScale})`,
              }}
            >
              {/* Full-frame Golden Frame Overlay on the video player */}
              {state.captionStyle.layoutPreset === "golden-frame" && (
                <div className="absolute inset-3 sm:inset-5 md:inset-7 border-[1.5px] border-amber-400/80 pointer-events-none z-20 shadow-[inset_0_0_24px_rgba(245,158,11,0.08)]">
                  <VintageCorner position="top-left" className="absolute -top-1.5 -left-1.5" />
                  <VintageCorner position="top-right" className="absolute -top-1.5 -right-1.5" />
                  <VintageCorner
                    position="bottom-left"
                    className="absolute -bottom-1.5 -left-1.5"
                  />
                  <VintageCorner
                    position="bottom-right"
                    className="absolute -bottom-1.5 -right-1.5"
                  />
                </div>
              )}

              <SubtitleOverlay />
            </div>
          </div>
        )}
      </div>

      <VideoControls videoRef={videoRef} />
    </div>
  );
}
