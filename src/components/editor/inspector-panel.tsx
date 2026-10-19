/**
 * ProCaptioner Editor — Right Inspector Panel
 * Tabs: TEXT | TEMPLATES | TRANSITIONS | AI | AUDIO
 * The TEXT tab is fully functional — all controls write to editor state.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  RotateCcw,
  Search,
  Save,
  Check,
  Trash2,
  X,
  Crown,
  Sparkles,
  ChevronDown,
  Type,
} from "lucide-react";
import {
  useCaptionStyle,
  useEditor,
  DEFAULT_CAPTION_STYLE,
  captionStyleToCSS,
  type CaptionStyle,
} from "@/lib/editor-store";
import {
  BUILT_IN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  searchTemplates,
  loadUserPresets,
  saveUserPreset,
  deleteUserPreset,
  type CaptionTemplate,
  type TemplateCategory,
} from "@/lib/caption-templates";
import { PremiumSubtitleRenderer } from "./premium-subtitle-renderer";

// ─── Inspector Tabs ───────────────────────────────────────────────────────────

const INSPECTOR_TABS = ["TEXT", "TEMPLATES", "TRANSITIONS", "AI", "AUDIO"] as const;
type InspectorTabLabel = (typeof INSPECTOR_TABS)[number];

const TAB_KEYS: Record<InspectorTabLabel, string> = {
  TEXT: "text",
  TEMPLATES: "templates",
  TRANSITIONS: "transitions",
  AI: "ai",
  AUDIO: "audio",
};

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <p className="mb-2.5 font-mono text-[0.58rem] tracking-[0.18em] text-white/35 uppercase">
      {label}
    </p>
  );
}

// ─── Label + Row ──────────────────────────────────────────────────────────────

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 font-mono text-[0.62rem] text-white/40">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

// ─── Accent slider ────────────────────────────────────────────────────────────

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}

function Slider({ min, max, step = 1, value, onChange, unit }: SliderProps) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="relative h-1 flex-1 rounded-full bg-white/[0.08]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        {/* Thumb indicator */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border border-accent bg-white shadow"
          style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 6px)` }}
        />
      </div>
      {unit && (
        <span className="w-10 text-right font-mono text-[0.62rem] text-white/60">
          {value}
          <span className="text-white/30">{unit}</span>
        </span>
      )}
    </div>
  );
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  { color: "#ffffff", label: "White" },
  { color: "#f97316", label: "Accent" },
  { color: "#38bdf8", label: "Sky" },
  { color: "#000000", label: "Black" },
];

// ─── Font options ─────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  // Google Fonts (loaded via CDN)
  "Geist",
  "Inter",
  "Roboto Mono",
  "Caveat",
  "Montserrat",
  "Playfair Display",
  "Cinzel",
  "Cormorant Garamond",
  "Outfit",
  "Plus Jakarta Sans",
  "Syne",
  "Anton",
  // System fonts
  "Georgia",
  "Arial",
  // Local fonts (loaded from /public/fonts/)
  "Ephesis",
  "Lora",
  "Playwrite CU Guides",
];
const FONT_WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extrabold" },
  { value: 900, label: "Black" },
];

// ─── Visual Font Family Picker ────────────────────────────────────────────────

function FontFamilyPicker({
  value,
  onChange,
  label = "Font",
  compact = false,
}: {
  value: string;
  onChange: (font: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", compact ? "" : "flex items-center justify-between gap-3")}
    >
      {!compact && <span className="shrink-0 font-mono text-[0.62rem] text-white/40">{label}</span>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded border transition-colors text-left",
          compact
            ? "w-full border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[0.65rem]"
            : "border-white/[0.10] bg-white/[0.04] px-2 py-1 text-[0.62rem]",
          "text-white/80 outline-none hover:border-accent/50",
          open && "border-accent/60",
        )}
      >
        <span className="flex-1 truncate" style={{ fontFamily: `"${value}", sans-serif` }}>
          {value}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-white/30 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-white/[0.12] bg-[#141414] shadow-2xl",
            compact ? "right-0 top-full" : "right-0 top-full",
          )}
        >
          {FONT_FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                onChange(f);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                f === value
                  ? "bg-accent/15 text-accent"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <span
                className="flex-1 text-sm truncate"
                style={{ fontFamily: `"${f}", sans-serif` }}
              >
                {f}
              </span>
              {f === value && <Check className="h-3 w-3 shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TEXT Tab ─────────────────────────────────────────────────────────────────

function TextTab() {
  const { style, set } = useCaptionStyle();

  return (
    <div className="space-y-5 overflow-y-auto p-4">
      {/* FONTS */}
      <div>
        <SectionHeading label="Fonts" />
        <div className="space-y-2.5">
          <FontFamilyPicker
            value={style.fontFamily}
            onChange={(f) => set({ fontFamily: f })}
            label="Family"
          />

          <PropRow label="Weight">
            <select
              value={style.fontWeight}
              onChange={(e) => set({ fontWeight: Number(e.target.value) })}
              className="rounded border border-white/[0.10] bg-white/[0.04] px-2 py-1 font-mono text-[0.62rem] text-white/80 outline-none transition-colors hover:border-accent/50 focus:border-accent/60"
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value} style={{ background: "#111" }}>
                  {w.label}
                </option>
              ))}
            </select>
          </PropRow>

          <div>
            <PropRow label="Size">
              <span className="font-mono text-[0.62rem] text-accent">{style.fontSize} px</span>
            </PropRow>
            <div className="mt-2">
              <Slider
                min={12}
                max={96}
                step={1}
                value={style.fontSize}
                onChange={(v) => set({ fontSize: v })}
                unit="px"
              />
            </div>
          </div>

          <div>
            <PropRow label="Words / caption">
              <span className="font-mono text-[0.62rem] text-accent">
                {(style.wordsPerCaption ?? 3) === 1
                  ? "1 word"
                  : `${style.wordsPerCaption ?? 3} words`}
              </span>
            </PropRow>
            <div className="mt-2">
              <Slider
                min={1}
                max={8}
                step={1}
                value={style.wordsPerCaption ?? 3}
                onChange={(v) => set({ wordsPerCaption: v })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* FORMAT */}
      <div>
        <SectionHeading label="Format" />
        <PropRow label="Alignment">
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => set({ alignment: a })}
                title={`Align ${a}`}
                className={cn(
                  "flex h-6 w-7 items-center justify-center rounded border transition-colors",
                  style.alignment === a
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-white/[0.10] text-white/35 hover:border-white/25 hover:text-white/70",
                )}
              >
                {a === "left" && (
                  <svg viewBox="0 0 12 10" className="h-2.5 w-3" fill="currentColor">
                    <rect x="0" y="0" width="12" height="1.5" />
                    <rect x="0" y="4" width="8" height="1.5" />
                    <rect x="0" y="8" width="10" height="1.5" />
                  </svg>
                )}
                {a === "center" && (
                  <svg viewBox="0 0 12 10" className="h-2.5 w-3" fill="currentColor">
                    <rect x="0" y="0" width="12" height="1.5" />
                    <rect x="2" y="4" width="8" height="1.5" />
                    <rect x="1" y="8" width="10" height="1.5" />
                  </svg>
                )}
                {a === "right" && (
                  <svg viewBox="0 0 12 10" className="h-2.5 w-3" fill="currentColor">
                    <rect x="0" y="0" width="12" height="1.5" />
                    <rect x="4" y="4" width="8" height="1.5" />
                    <rect x="2" y="8" width="10" height="1.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </PropRow>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* POSITION */}
      <div>
        <SectionHeading label="Position" />
        <div className="space-y-2.5">
          {/* Vertical position preset */}
          <PropRow label="Preset">
            <div className="flex gap-1">
              {(["top", "center", "bottom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => set({ position: p })}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase transition-colors",
                    style.position === p
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-white/[0.10] text-white/35 hover:border-white/25 hover:text-white/70",
                  )}
                >
                  {p.slice(0, 3)}
                </button>
              ))}
            </div>
          </PropRow>

          <div>
            <div className="flex items-center justify-between">
              <PropRow label="Y Offset">
                <span className="font-mono text-[0.62rem] text-accent">
                  {style.yOffset.toFixed(1)} %
                </span>
              </PropRow>
              <button
                onClick={() =>
                  set({
                    yOffset: DEFAULT_CAPTION_STYLE.yOffset,
                    position: DEFAULT_CAPTION_STYLE.position,
                  })
                }
                title="Reset position"
                className="ml-auto flex items-center gap-1 text-white/25 transition-colors hover:text-white/60"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-2">
              <Slider
                min={0}
                max={100}
                step={0.5}
                value={style.yOffset}
                onChange={(v) => set({ yOffset: v })}
                unit="%"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* COLOR */}
      <div>
        <SectionHeading label="Color" />
        <div className="flex gap-2 flex-wrap">
          {COLOR_SWATCHES.map((s) => (
            <button
              key={s.color}
              title={s.label}
              onClick={() => set({ textColor: s.color })}
              className={cn(
                "h-7 w-7 rounded border-2 transition-all",
                style.textColor === s.color
                  ? "border-accent scale-110"
                  : "border-white/20 hover:border-white/50",
              )}
              style={{ backgroundColor: s.color }}
            />
          ))}
          {/* Custom color */}
          <label
            className="relative h-7 w-7 cursor-pointer rounded border-2 border-dashed border-white/20 transition-colors hover:border-white/50 overflow-hidden"
            title="Custom color"
          >
            <span className="absolute inset-0 flex items-center justify-center text-[0.7rem] text-white/30">
              +
            </span>
            <input
              type="color"
              value={style.textColor}
              onChange={(e) => set({ textColor: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>

        {/* Highlight color */}
        <div className="mt-3">
          <PropRow label="Highlight">
            <div className="flex items-center gap-1.5">
              {COLOR_SWATCHES.map((s) => (
                <button
                  key={s.color}
                  title={s.label}
                  onClick={() => set({ highlightColor: s.color })}
                  className={cn(
                    "h-5 w-5 rounded border transition-all",
                    style.highlightColor === s.color
                      ? "border-white scale-110"
                      : "border-white/15 hover:border-white/40",
                  )}
                  style={{ backgroundColor: s.color }}
                />
              ))}
            </div>
          </PropRow>
        </div>

        {/* Background opacity */}
        <div className="mt-3">
          <PropRow label="BG Opacity">
            <span className="font-mono text-[0.62rem] text-accent">
              {Math.round(style.bgOpacity * 100)}%
            </span>
          </PropRow>
          <div className="mt-2">
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={style.bgOpacity}
              onChange={(v) => set({ bgOpacity: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template Card Preview (Universal CSS Renderer) ────────────────────────────

function TemplateCardPreview({ template }: { template: CaptionTemplate }) {
  const { sampleText, style } = template;

  if (style.layoutPreset) {
    const rawWords = sampleText.primary.split(/\s+/).filter(Boolean);
    const words = rawWords.map((text) => ({
      text,
      active: sampleText.accent
        ? sampleText.accent.toLowerCase().includes(text.toLowerCase())
        : false,
    }));

    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden pointer-events-none">
        <PremiumSubtitleRenderer
          layoutPreset={style.layoutPreset}
          captionStyle={{
            ...DEFAULT_CAPTION_STYLE,
            ...style,
          }}
          words={words}
          kickerText={sampleText.kicker}
          heroText={sampleText.hero}
          secondaryText={sampleText.secondary}
          scale={0.52}
          isCardPreview={true}
        />
      </div>
    );
  }

  // Scale font to fit preview card proportionally
  const baseFontSize = style.fontSize ?? DEFAULT_CAPTION_STYLE.fontSize;
  const scaledFontSize = Math.max(9, Math.min(baseFontSize * 0.42, 16));

  const previewCss = captionStyleToCSS({
    ...DEFAULT_CAPTION_STYLE,
    ...style,
    fontSize: scaledFontSize,
  });

  // Render accent text: split primary around the accent word
  const renderPrimaryText = () => {
    const primary = sampleText.primary;
    const accent = sampleText.accent;
    const highlightColor = style.highlightColor || "#f97316";
    const accentStyle = style.accentStyle;

    if (!accent) return <span>{primary}</span>;

    const accentIndex = primary.indexOf(accent);
    if (accentIndex === -1) {
      // Accent word not found in primary — render separately
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span>{primary}</span>
          <span
            style={{
              color: highlightColor,
              ...(accentStyle === "glow-word"
                ? { textShadow: `0 0 10px ${highlightColor}, 0 0 20px ${highlightColor}` }
                : {}),
              ...(accentStyle === "script" && style.secondaryFontFamily
                ? {
                    fontFamily: `"${style.secondaryFontFamily}", cursive`,
                    fontStyle: "italic" as const,
                  }
                : {}),
            }}
          >
            {accent}
          </span>
        </div>
      );
    }

    const before = primary.slice(0, accentIndex);
    const after = primary.slice(accentIndex + accent.length);

    const accentSpanStyle: React.CSSProperties = {
      color: highlightColor,
      ...(accentStyle === "glow-word"
        ? { textShadow: `0 0 10px ${highlightColor}, 0 0 20px ${highlightColor}` }
        : {}),
      ...(accentStyle === "script" && style.secondaryFontFamily
        ? { fontFamily: `"${style.secondaryFontFamily}", cursive`, fontStyle: "italic" }
        : {}),
    };

    const accentSpan =
      accentStyle === "circle-oval" ? (
        <span
          style={{
            color: highlightColor,
            border: `1.5px solid ${highlightColor}`,
            borderRadius: "9999px",
            padding: "0 4px",
            boxShadow: `0 0 6px ${highlightColor}40`,
          }}
        >
          {accent}
        </span>
      ) : (
        <span style={accentSpanStyle}>{accent}</span>
      );

    return (
      <span>
        {before}
        {accentSpan}
        {after}
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
      <div className="inline-block max-w-[95%] text-center" style={previewCss}>
        {renderPrimaryText()}
      </div>
      {sampleText.secondary && (
        <span
          className="text-[0.55rem] mt-0.5"
          style={{
            color: style.secondaryTextColor || "rgba(255,255,255,0.6)",
            fontFamily: style.secondaryFontFamily
              ? `"${style.secondaryFontFamily}", cursive`
              : previewCss.fontFamily,
            fontStyle: style.secondaryFontFamily ? "italic" : "normal",
          }}
        >
          {sampleText.secondary}
        </span>
      )}
    </div>
  );
}

// ─── TEMPLATES Tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
  const { state, dispatch } = useEditor();
  const [activeSubTab, setActiveSubTab] = useState<"builtin" | "presets">("builtin");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("All");
  const [userPresets, setUserPresets] = useState<CaptionTemplate[]>(() => loadUserPresets());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");

  const builtinFiltered = useMemo(
    () => searchTemplates(BUILT_IN_TEMPLATES, searchQuery, selectedCategory),
    [searchQuery, selectedCategory],
  );

  const presetsFiltered = useMemo(
    () => searchTemplates(userPresets, searchQuery, "All"),
    [userPresets, searchQuery],
  );

  const handleApplyTemplate = (t: CaptionTemplate) => {
    dispatch({
      type: "APPLY_TEMPLATE",
      payload: { ...t.style, stylePreset: t.name },
    });
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    const created = saveUserPreset(presetNameInput, state.captionStyle);
    setUserPresets(loadUserPresets());
    setPresetNameInput("");
    setIsSaveModalOpen(false);
    setActiveSubTab("presets");
    handleApplyTemplate(created);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUserPreset(id);
    setUserPresets(updated);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Sub-tab Switcher: Built-in Templates vs My Presets ── */}
      <div className="p-2.5 pb-2 border-b border-white/[0.06] bg-[#0e0e0e]">
        <div className="grid grid-cols-2 rounded bg-black/40 p-1 border border-white/[0.06]">
          <button
            onClick={() => setActiveSubTab("builtin")}
            className={cn(
              "rounded py-1.5 font-mono text-[0.62rem] tracking-wider uppercase transition-all",
              activeSubTab === "builtin"
                ? "bg-[#222222] text-white shadow-sm font-semibold"
                : "text-white/40 hover:text-white/75",
            )}
          >
            Built-in Templates
          </button>
          <button
            onClick={() => setActiveSubTab("presets")}
            className={cn(
              "rounded py-1.5 font-mono text-[0.62rem] tracking-wider uppercase transition-all",
              activeSubTab === "presets"
                ? "bg-[#222222] text-white shadow-sm font-semibold"
                : "text-white/40 hover:text-white/75",
            )}
          >
            My Presets ({userPresets.length})
          </button>
        </div>

        {/* ── Search & Save preset row ── */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/35" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeSubTab === "builtin" ? "Find a template" : "Find a preset"}
              className="w-full rounded border border-white/[0.08] bg-black/50 pl-8 pr-7 py-1.5 text-[0.68rem] text-white/90 placeholder:text-white/30 outline-none transition-colors focus:border-accent/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setPresetNameInput(`${state.captionStyle.stylePreset || "Custom"} Preset`);
              setIsSaveModalOpen(true);
            }}
            title="Save current caption style as preset"
            className="flex shrink-0 items-center gap-1.5 rounded border border-white/[0.12] bg-white/[0.04] px-2.5 py-1.5 font-mono text-[0.6rem] tracking-wider text-white/70 uppercase transition-colors hover:border-accent/60 hover:text-accent hover:bg-accent/10"
          >
            <Save className="h-3 w-3" />
            Save preset
          </button>
        </div>

        {/* ── Category Chips (Built-in only) ── */}
        {activeSubTab === "builtin" && (
          <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isPremium = cat === "Premium";
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[0.55rem] tracking-wider uppercase transition-all flex items-center gap-1",
                    isSelected
                      ? isPremium
                        ? "border-amber-500/70 bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 font-bold shadow-sm shadow-amber-500/10"
                        : "border-accent/60 bg-accent/20 text-accent font-semibold"
                      : isPremium
                        ? "border-amber-500/30 bg-amber-950/20 text-amber-400/80 hover:border-amber-500/60 hover:text-amber-300"
                        : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/70",
                  )}
                >
                  {isPremium && <Crown className="h-2.5 w-2.5 text-amber-400" />}
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Template Cards List ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {/* Premium Collection Banner when Premium or All is active */}
        {activeSubTab === "builtin" &&
          (selectedCategory === "Premium" || (!searchQuery && selectedCategory === "All")) && (
            <div className="rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#18140e] to-black p-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/20 text-amber-400">
                  <Crown className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[0.6rem] font-bold tracking-wider text-amber-300 uppercase">
                      PREMIUM STUDIO COLLECTION
                    </span>
                    <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[0.48rem] font-bold text-amber-400">
                      10 PRESETS
                    </span>
                  </div>
                  <p className="text-[0.55rem] text-white/55 truncate">
                    Editorial & cinematic typography systems with complete hierarchy & animations
                  </p>
                </div>
              </div>
            </div>
          )}

        {activeSubTab === "builtin" ? (
          builtinFiltered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-xs text-white/30">No templates found</p>
              <p className="mt-1 text-[0.65rem] text-white/20">Try another search keyword</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-3 text-[0.62rem] font-mono text-accent underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            builtinFiltered.map((t) => {
              const isApplied = state.captionStyle.stylePreset === t.name;
              const isPremium = t.category === "Premium";
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group relative flex flex-col rounded-lg border p-2.5 transition-all select-none",
                    isApplied
                      ? "border-accent/80 bg-[#191919] ring-1 ring-accent/60"
                      : isPremium
                        ? "border-amber-500/25 bg-gradient-to-b from-[#181512] to-[#111111] hover:border-amber-500/50 hover:bg-[#1b1713]"
                        : "border-white/[0.07] bg-[#141414] hover:border-white/25 hover:bg-[#181818]",
                  )}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleApplyTemplate(t)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-semibold text-xs group-hover:text-white",
                          isPremium ? "text-amber-100" : "text-white/90",
                        )}
                      >
                        {t.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPremium ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-950/70 px-2 py-0.5 font-mono text-[0.52rem] text-amber-300 flex items-center gap-1 font-semibold tracking-wider">
                          <Crown className="h-2.5 w-2.5 inline text-amber-400" />
                          PRO
                        </span>
                      ) : t.badge === "New" ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[0.55rem] text-emerald-400">
                          New
                        </span>
                      ) : t.badge === "Pro" ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[0.55rem] text-amber-400 flex items-center gap-0.5">
                          <Crown className="h-2.5 w-2.5 inline" />
                        </span>
                      ) : t.badge === "Popular" ? (
                        <span className="rounded-full border border-sky-500/40 bg-sky-950/60 px-1.5 py-0.5 font-mono text-[0.55rem] text-sky-400">
                          Hot
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Live Preview Box */}
                  <div
                    className={cn(
                      "mt-2 flex items-center justify-center rounded overflow-hidden relative cursor-pointer border transition-colors",
                      isPremium
                        ? "h-28 bg-[#090807] border-amber-500/25 p-0.5 group-hover:border-amber-500/45"
                        : "h-24 bg-[#0b0b0b] border-white/[0.04] p-2",
                    )}
                    onClick={() => handleApplyTemplate(t)}
                  >
                    <TemplateCardPreview template={t} />
                  </div>

                  {/* Font Override — only visible when this template is currently applied */}
                  {isApplied && (
                    <div className="mt-2 rounded border border-white/[0.08] bg-black/30 p-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Type className="h-3 w-3 text-accent/70" />
                        <span className="font-mono text-[0.55rem] tracking-wider text-white/45 uppercase">
                          Override Font
                        </span>
                      </div>
                      <FontFamilyPicker
                        value={state.captionStyle.fontFamily}
                        onChange={(f) =>
                          dispatch({
                            type: "SET_CAPTION_STYLE",
                            payload: { fontFamily: f },
                          })
                        }
                        compact
                      />
                    </div>
                  )}

                  {isApplied && t.id === "kinetic-focus" && (
                    <div className="mt-3 border-t border-white/[0.08] pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[0.55rem] tracking-wider text-amber-300 uppercase">
                          Active Word Gradient
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[0.45rem] tracking-widest text-white/50 uppercase block mb-1">
                            Start Color
                          </label>
                          <div className="flex items-center gap-2 rounded border border-white/10 bg-black/30 p-1.5">
                            <input
                              type="color"
                              value={state.captionStyle.highlightGradientStart || "#22c55e"}
                              onChange={(e) =>
                                dispatch({
                                  type: "SET_CAPTION_STYLE",
                                  payload: { highlightGradientStart: e.target.value },
                                })
                              }
                              className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <span className="font-mono text-[0.55rem] text-white/60 uppercase">
                              {state.captionStyle.highlightGradientStart || "#22c55e"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[0.45rem] tracking-widest text-white/50 uppercase block mb-1">
                            End Color
                          </label>
                          <div className="flex items-center gap-2 rounded border border-white/10 bg-black/30 p-1.5">
                            <input
                              type="color"
                              value={state.captionStyle.highlightGradientEnd || "#3b82f6"}
                              onChange={(e) =>
                                dispatch({
                                  type: "SET_CAPTION_STYLE",
                                  payload: { highlightGradientEnd: e.target.value },
                                })
                              }
                              className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <span className="font-mono text-[0.55rem] text-white/60 uppercase">
                              {state.captionStyle.highlightGradientEnd || "#3b82f6"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Footer: Tags + status */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 flex-wrap">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[0.55rem]",
                            isPremium
                              ? "bg-amber-500/10 text-amber-200/70 border border-amber-500/15"
                              : "bg-white/[0.04] text-white/40",
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {isApplied ? (
                      <span className="flex items-center gap-1 font-mono text-[0.58rem] text-accent">
                        <Check className="h-3 w-3" />
                        Applied
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "font-mono text-[0.58rem] cursor-pointer transition-colors",
                          isPremium
                            ? "text-amber-400/70 hover:text-amber-300 font-semibold"
                            : "text-white/25 group-hover:text-white/60",
                        )}
                        onClick={() => handleApplyTemplate(t)}
                      >
                        Apply
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : presetsFiltered.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-white/20" />
            <p className="mt-2 font-mono text-xs text-white/40">No custom presets saved</p>
            <p className="mt-1 text-[0.65rem] text-white/25">
              Customize any caption style in the TEXT tab, then click &ldquo;Save preset&rdquo;
              above to save it here.
            </p>
            <button
              onClick={() => {
                setPresetNameInput(`${state.captionStyle.stylePreset || "Custom"} Preset`);
                setIsSaveModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded border border-accent/60 bg-accent/15 px-3 py-1.5 font-mono text-[0.62rem] text-accent hover:bg-accent/25"
            >
              <Save className="h-3 w-3" />
              Save Current Style
            </button>
          </div>
        ) : (
          presetsFiltered.map((p) => {
            const isApplied = state.captionStyle.stylePreset === p.name;
            return (
              <div
                key={p.id}
                className={cn(
                  "group relative flex flex-col rounded-lg border bg-[#141414] p-2.5 transition-all select-none",
                  isApplied
                    ? "border-accent/80 bg-[#191919] ring-1 ring-accent/60"
                    : "border-white/[0.07] hover:border-white/25 hover:bg-[#181818]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-semibold text-xs text-white/90 group-hover:text-white cursor-pointer flex-1"
                    onClick={() => handleApplyTemplate(p)}
                  >
                    {p.name}
                  </span>
                  <button
                    onClick={(e) => handleDeletePreset(p.id, e)}
                    title="Delete preset"
                    className="p-1 text-white/25 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div
                  className="mt-2 flex h-20 items-center justify-center rounded bg-[#0b0b0b] border border-white/[0.04] p-2 overflow-hidden cursor-pointer"
                  onClick={() => handleApplyTemplate(p)}
                >
                  <TemplateCardPreview template={p} />
                </div>

                {/* Font Override — only visible when this preset is currently applied */}
                {isApplied && (
                  <div className="mt-2 rounded border border-white/[0.08] bg-black/30 p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Type className="h-3 w-3 text-accent/70" />
                      <span className="font-mono text-[0.55rem] tracking-wider text-white/45 uppercase">
                        Override Font
                      </span>
                    </div>
                    <FontFamilyPicker
                      value={state.captionStyle.fontFamily}
                      onChange={(f) =>
                        dispatch({
                          type: "SET_CAPTION_STYLE",
                          payload: { fontFamily: f },
                        })
                      }
                      compact
                    />
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[0.55rem] text-white/35">Custom Preset</span>
                  {isApplied ? (
                    <span className="flex items-center gap-1 font-mono text-[0.58rem] text-accent">
                      <Check className="h-3 w-3" />
                      Applied
                    </span>
                  ) : (
                    <span
                      className="font-mono text-[0.58rem] text-white/25 group-hover:text-white/60 cursor-pointer"
                      onClick={() => handleApplyTemplate(p)}
                    >
                      Apply
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Save Preset Modal ── */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-lg border border-white/[0.12] bg-[#141414] p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h3 className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
                Save Style as Preset
              </h3>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="mt-3">
              <label className="font-mono text-[0.62rem] text-white/50 block mb-1">
                Preset Name
              </label>
              <input
                type="text"
                autoFocus
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="e.g. My Glow Style"
                className="w-full rounded border border-white/[0.12] bg-black/50 px-3 py-1.5 text-xs text-white outline-none focus:border-accent"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="rounded px-3 py-1.5 font-mono text-[0.62rem] text-white/50 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!presetNameInput.trim()}
                  className="rounded bg-accent px-4 py-1.5 font-mono text-[0.62rem] font-semibold text-accent-foreground disabled:opacity-50 hover:opacity-90"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stub Tab ─────────────────────────────────────────────────────────────────

function StubTab({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-xs text-white/20 uppercase">{label}</p>
        <p className="mt-1 font-mono text-[0.6rem] text-white/12">Coming soon</p>
      </div>
    </div>
  );
}

// ─── Inspector Panel ──────────────────────────────────────────────────────────

export function InspectorPanel() {
  const { state, dispatch } = useEditor();

  const activeTab = state.inspectorTab.toUpperCase() as InspectorTabLabel;

  return (
    <div className="flex h-full flex-col border-l border-white/[0.07] bg-[#111111]">
      {/* Tab bar */}
      <div className="flex shrink-0 overflow-x-auto border-b border-white/[0.07] bg-[#0e0e0e] scrollbar-none">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() =>
              dispatch({
                type: "SET_INSPECTOR_TAB",
                payload: TAB_KEYS[tab] as typeof state.inspectorTab,
              })
            }
            className={cn(
              "shrink-0 px-2 py-2 font-mono text-[0.52rem] tracking-[0.12em] uppercase transition-colors sm:px-2.5 sm:text-[0.57rem]",
              activeTab === tab
                ? "border-b border-accent text-accent"
                : "text-white/30 hover:text-white/60",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {state.inspectorTab === "text" && <TextTab />}
        {state.inspectorTab === "templates" && <TemplatesTab />}
        {state.inspectorTab === "transitions" && <StubTab label="Transitions" />}
        {state.inspectorTab === "ai" && <StubTab label="AI Copilot" />}
        {state.inspectorTab === "audio" && <StubTab label="Audio" />}
      </div>
    </div>
  );
}
