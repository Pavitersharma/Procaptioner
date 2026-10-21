/**
 * ProCaptioner Editor — Bottom Timeline Panel
 * Shows: time ruler, caption blocks, waveform, playhead, zoom slider
 */

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useEditor } from "@/lib/editor-store";
import { ZoomIn, ZoomOut, Scissors, Square, Circle } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRuler(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Track Tab ────────────────────────────────────────────────────────────────

const TRACK_TABS = [
  { key: "word", label: "WORD" },
  { key: "line", label: "LINE" },
  { key: "cut", icon: <Scissors className="h-3 w-3" /> },
  { key: "box", icon: <Square className="h-3 w-3" /> },
  {
    key: "circle",
    icon: (
      <>
        <Circle className="h-2.5 w-2.5" />
        <Circle className="h-2.5 w-2.5" />
      </>
    ),
  },
] as const;

// ─── Time Ruler ───────────────────────────────────────────────────────────────

function TimeRuler({
  duration,
  zoom,
  scrollLeft,
}: {
  duration: number;
  zoom: number;
  scrollLeft: number;
}) {
  if (duration <= 0) return null;

  const totalWidth = duration * zoom;
  // Tick every ~80px
  const tickInterval = Math.max(1, Math.round(80 / zoom));
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t);
  }

  return (
    <div
      className="relative h-6 shrink-0 overflow-hidden border-b border-white/[0.07]"
      style={{ width: `${totalWidth}px`, minWidth: "100%" }}
    >
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${(t / duration) * totalWidth}px` }}
        >
          <div className="h-2 w-px bg-white/[0.20]" />
          <span className="mt-0.5 font-mono text-[0.48rem] text-white/30 whitespace-nowrap">
            {fmtRuler(t)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function Waveform({ width }: { width: number }) {
  // Generate a pseudo-waveform pattern (deterministic, based on index)
  const bars = Math.max(40, Math.floor(width / 3));
  return (
    <div className="flex h-8 w-full items-center gap-[1px] overflow-hidden border border-white/[0.06] bg-[#0a0a0a] px-1">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 0.8 + i * 0.13) * 20);
        return (
          <span
            key={i}
            className="w-full shrink-0 rounded-full bg-white/25"
            style={{ height: `${h.toFixed(1)}px` }}
          />
        );
      })}
    </div>
  );
}

// ─── Caption Track ────────────────────────────────────────────────────────────

function CaptionTrack({
  zoom,
  duration,
  onSeek,
}: {
  zoom: number;
  duration: number;
  onSeek: (t: number) => void;
}) {
  const { state } = useEditor();
  if (duration <= 0) return null;

  const totalWidth = duration * zoom;

  return (
    <div className="relative h-7" style={{ width: `${totalWidth}px`, minWidth: "100%" }}>
      {state.subtitles.map((sub, i) => {
        const left = (sub.start / duration) * totalWidth;
        const width = Math.max(2, ((sub.end - sub.start) / duration) * totalWidth);
        const isActive = i === state.activeSubIndex;

        return (
          <button
            key={sub.index}
            onClick={() => onSeek(sub.start)}
            className={cn(
              "absolute top-0 flex h-full items-center overflow-hidden rounded-[2px] border px-1.5 font-mono text-[0.52rem] whitespace-nowrap transition-colors",
              isActive
                ? "border-accent/80 bg-accent/20 text-accent"
                : "border-accent/25 bg-accent/8 text-accent/55 hover:bg-accent/15",
            )}
            style={{ left: `${left}px`, width: `${width}px` }}
            title={sub.text}
          >
            {sub.text.slice(0, 24)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Playhead ─────────────────────────────────────────────────────────────────

function Playhead({ pct }: { pct: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
      style={{ left: `${pct}%` }}
    >
      {/* Arrow tip */}
      <span
        className="absolute -top-0 left-1/2 -translate-x-1/2 h-0 w-0"
        style={{
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "6px solid var(--color-accent)",
        }}
      />
    </div>
  );
}

// ─── Timeline Panel ───────────────────────────────────────────────────────────

interface TimelinePanelProps {
  onSeek: (t: number) => void;
}

export function TimelinePanel({ onSeek }: TimelinePanelProps) {
  const { state, dispatch } = useEditor();
  const { duration, currentTime, zoom } = state;
  const scrollRef = useRef<HTMLDivElement>(null);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
      const totalW = duration * zoom;
      const t = Math.max(0, Math.min(duration, (relX / totalW) * duration));
      onSeek(t);
    },
    [duration, zoom, onSeek],
  );

  return (
    <div className="flex flex-col border-t border-white/[0.07] bg-[#0d0d0d] h-[100px] md:h-[160px]">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-white/[0.07] bg-[#0b0b0b] px-2 py-1 sm:px-3 sm:py-1.5">
        {/* Track type tabs */}
        <div className="flex items-center gap-px overflow-x-auto scrollbar-none">
          {TRACK_TABS.map((tab) => (
            <button
              key={tab.key}
              className="inline-flex h-6 items-center gap-1 rounded px-1.5 font-mono text-[0.52rem] tracking-[0.08em] text-white/35 uppercase transition-colors hover:text-white/70 sm:px-2 sm:text-[0.58rem] shrink-0"
            >
              {"icon" in tab ? tab.icon : tab.label}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="hidden font-mono text-[0.55rem] text-white/25 uppercase sm:inline">
            {duration > 0 ? fmtRuler(duration) : "00:00"}
          </span>
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", payload: Math.max(1, zoom - 1) })}
            className="grid h-5 w-5 place-items-center text-white/30 transition-colors hover:text-white/70"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={zoom}
            onChange={(e) => dispatch({ type: "SET_ZOOM", payload: Number(e.target.value) })}
            className="h-1 w-12 cursor-pointer accent-[var(--color-accent)] outline-none sm:w-20"
          />
          <button
            onClick={() => dispatch({ type: "SET_ZOOM", payload: Math.min(20, zoom + 1) })}
            className="grid h-5 w-5 place-items-center text-white/30 transition-colors hover:text-white/70"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Scrollable track area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ position: "relative" }}
      >
        <div
          className="relative"
          style={{
            width: duration > 0 ? `${duration * zoom}px` : "100%",
            minWidth: "100%",
            minHeight: "100%",
          }}
          onClick={handleClick}
        >
          {/* Time ruler */}
          <TimeRuler
            duration={duration}
            zoom={zoom}
            scrollLeft={scrollRef.current?.scrollLeft ?? 0}
          />

          {/* Track rows */}
          <div className="flex flex-col gap-1 p-1">
            {/* Caption blocks */}
            <CaptionTrack zoom={zoom} duration={duration} onSeek={onSeek} />
            {/* Waveform */}
            <Waveform width={duration * zoom} />
          </div>

          {/* Playhead overlay */}
          {duration > 0 && <Playhead pct={pct} />}
        </div>
      </div>
    </div>
  );
}
