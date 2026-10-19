/**
 * ProCaptioner Editor — Left Sidebar Panel
 * Shows: icon rail + captions tab (editable subtitle list with word-level karaoke)
 */

import { useEffect, useRef, useCallback } from "react";
import { Type, Film, Scissors, Search, ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor } from "@/lib/editor-store";

// ─── Time helpers ──────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

// ─── Icon Rail ────────────────────────────────────────────────────────────────

const RAIL_TABS = [
  { key: "captions" as const, icon: Type, label: "Captions" },
  { key: "text" as const, icon: Scissors, label: "Text" },
  { key: "media" as const, icon: Film, label: "Media" },
] as const;

function IconRail() {
  const { state, dispatch } = useEditor();

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-white/[0.07] bg-[#0e0e0e] py-3 sm:w-12">
      {RAIL_TABS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => dispatch({ type: "SET_SIDEBAR_TAB", payload: key })}
          className={cn(
            "grid h-9 w-9 place-items-center rounded transition-colors sm:h-10 sm:w-10",
            state.sidebarTab === key
              ? "bg-accent/15 text-accent"
              : "text-white/35 hover:text-white/70",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

// ─── Caption Entry ────────────────────────────────────────────────────────────

interface CaptionEntryProps {
  index: number;
  isActive: boolean;
  isSelected: boolean;
  currentTime: number;
  onSeek: (time: number) => void;
  onSelect: () => void;
}

function CaptionEntry({
  index,
  isActive,
  isSelected,
  currentTime,
  onSeek,
  onSelect,
}: CaptionEntryProps) {
  const { state, dispatch } = useEditor();
  const sub = state.subtitles[index];
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Scroll active subtitle into view
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);

  const handleTextChange = useCallback(() => {
    if (!textRef.current || !sub) return;
    const text = textRef.current.innerText.replace(/\n/g, " ").trim();
    dispatch({ type: "SET_SUBTITLE_TEXT", payload: { index: sub.index, text } });
  }, [dispatch, sub]);

  if (!sub) return null;

  const displayText = state.script === "roman" && sub.roman_text ? sub.roman_text : sub.text;

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        "group relative flex cursor-pointer gap-2.5 border-b border-white/[0.06] px-3 py-2.5 transition-colors",
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
        isSelected && "ring-1 ring-inset ring-accent/50",
      )}
    >
      {/* Index + timestamp */}
      <div className="flex w-7 shrink-0 flex-col items-center gap-0.5 pt-0.5">
        <span
          className={cn(
            "font-mono text-[0.6rem] leading-none",
            isActive ? "text-accent" : "text-white/25",
          )}
        >
          {sub.index}
        </span>
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <p
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLElement).blur();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "cursor-text text-sm leading-snug outline-none focus:ring-1 focus:ring-accent/40 rounded-sm px-0.5",
            isActive ? "text-white" : "text-white/55",
          )}
          style={{
            direction:
              state.detectedLanguage === "ar" ||
              state.detectedLanguage === "ur" ||
              state.detectedLanguage === "he"
                ? "rtl"
                : "ltr",
          }}
        >
          {/* Word-level karaoke highlighting when active */}
          {isActive && sub.words.length > 0
            ? sub.words.map((w, wi) => {
                const isCurrentWord = currentTime >= w.start && currentTime <= w.end;
                const wordText = state.script === "roman" && w.roman_word ? w.roman_word : w.word;
                return (
                  <span
                    key={wi}
                    className={cn(
                      "rounded-sm transition-colors duration-100",
                      isCurrentWord
                        ? "bg-accent/90 text-accent-foreground px-0.5"
                        : "text-white/80",
                    )}
                  >
                    {wordText}{" "}
                  </span>
                );
              })
            : displayText}
        </p>

        {/* Timestamp */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSeek(sub.start);
          }}
          className={cn(
            "mt-1 font-mono text-[0.58rem] transition-colors hover:text-accent",
            isActive ? "text-accent" : "text-white/22",
          )}
        >
          {fmt(sub.start)}
        </button>
      </div>
    </div>
  );
}

// ─── Captions Panel ───────────────────────────────────────────────────────────

function CaptionsPanel({ onSeek }: { onSeek: (t: number) => void }) {
  const { state, dispatch } = useEditor();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] bg-[#111111] px-3 py-2">
        <span className="font-mono text-[0.68rem] font-medium tracking-[0.12em] text-white/80 uppercase">
          Captions
        </span>
        <div className="flex items-center gap-1.5">
          <button className="grid h-6 w-6 place-items-center rounded text-white/30 transition-colors hover:text-white/70">
            <Search className="h-3 w-3" />
          </button>
          <button className="inline-flex items-center gap-1 rounded border border-white/[0.10] bg-white/[0.04] px-2 py-1 font-mono text-[0.58rem] tracking-[0.1em] text-white/50 uppercase transition-colors hover:border-accent/50 hover:text-accent">
            <Settings2 className="h-2.5 w-2.5" />
            Caption Tools
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Script toggle */}
      <div className="flex border-b border-white/[0.07] bg-[#0e0e0e]">
        {(["native", "roman"] as const).map((s) => (
          <button
            key={s}
            onClick={() => dispatch({ type: "SET_SCRIPT", payload: s })}
            className={cn(
              "flex-1 py-1.5 font-mono text-[0.58rem] tracking-[0.12em] uppercase transition-colors",
              state.script === s
                ? "border-b border-accent text-accent"
                : "text-white/30 hover:text-white/60",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Subtitle list */}
      <div className="flex-1 overflow-y-auto">
        {state.subtitles.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs text-white/20">No captions</p>
          </div>
        ) : (
          state.subtitles.map((_, i) => (
            <CaptionEntry
              key={i}
              index={i}
              isActive={i === state.activeSubIndex}
              isSelected={i === state.selectedSubIndex}
              currentTime={state.currentTime}
              onSeek={onSeek}
              onSelect={() => dispatch({ type: "SELECT_SUB", payload: i })}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Stub panels ──────────────────────────────────────────────────────────────

function StubPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-xs text-white/20 uppercase">{label}</p>
        <p className="mt-1 font-mono text-[0.6rem] text-white/12">Coming soon</p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function SidebarPanel({ onSeek }: { onSeek: (t: number) => void }) {
  const { state } = useEditor();

  return (
    <div className="flex h-full border-r border-white/[0.07] bg-[#111111]">
      <IconRail />
      <div className="flex flex-1 flex-col overflow-hidden">
        {state.sidebarTab === "captions" && <CaptionsPanel onSeek={onSeek} />}
        {state.sidebarTab === "text" && <StubPanel label="Text Overlays" />}
        {state.sidebarTab === "media" && <StubPanel label="Media Library" />}
      </div>
    </div>
  );
}
