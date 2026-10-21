import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Search,
  Crown,
  Flame,
  Eye,
  Check,
  ArrowRight,
  X,
  Play,
  Pause,
  Layers,
  Type,
  Palette,
  Film,
  SlidersHorizontal,
  Smartphone,
  Monitor,
} from "lucide-react";
import {
  BUILT_IN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  searchTemplates,
  type CaptionTemplate,
  type TemplateCategory,
} from "@/lib/caption-templates";
import {
  DEFAULT_CAPTION_STYLE,
  captionStyleToCSS,
  type CaptionStyle,
} from "@/lib/editor-store";
import { PremiumSubtitleRenderer } from "@/components/editor/premium-subtitle-renderer";
import { cn } from "@/lib/utils";

export const ACTIVE_TEMPLATE_KEY = "procaptioner_active_template";

export function TemplatesView() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CaptionTemplate | null>(null);

  // Load currently active template from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TEMPLATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) setActiveTemplateId(parsed.id);
      }
    } catch {
      // ignore JSON parse error
    }
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return searchTemplates(BUILT_IN_TEMPLATES, searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Template count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: BUILT_IN_TEMPLATES.length };
    BUILT_IN_TEMPLATES.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, []);

  const handleSelectTemplate = (template: CaptionTemplate) => {
    try {
      localStorage.setItem(ACTIVE_TEMPLATE_KEY, JSON.stringify(template));
      setActiveTemplateId(template.id);
    } catch {
      // ignore
    }
    // Navigate to dashboard ready to use this template
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12 font-sans">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-br from-[#121214] via-[#0d0d0f] to-[#08080a] p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#ff7a1a]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 px-3 py-1 font-mono text-[0.68rem] font-bold tracking-wider text-[#ff7a1a] uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>30+ Studio Caption Presets</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Caption Templates
              </h1>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm text-neutral-400">
                Browse our complete box collection of cinematic, viral shorts, podcast, and editorial caption presets.
                Select any template to apply it directly to your footage.
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="flex items-center gap-2 self-start md:self-auto rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 font-mono text-xs text-neutral-300">
              <Layers className="h-4 w-4 text-[#ff7a1a]" />
              <span>
                <strong className="text-white">{filteredTemplates.length}</strong> of {BUILT_IN_TEMPLATES.length} Styles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search and Filter Controls ── */}
      <div className="space-y-4">
        {/* Search bar & quick filter summary */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by style, font, or tag (e.g. Serif, Bold, Shorts)..."
              className="w-full rounded-xl border border-neutral-800 bg-[#121212] py-2 pl-10 pr-9 text-xs text-white placeholder-neutral-500 transition-colors focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {activeTemplateId && (
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span className="h-2 w-2 rounded-full bg-[#ff7a1a] animate-pulse" />
              <span>Current Default Active</span>
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {TEMPLATE_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] || 0;
            const isPremium = category === "Premium";

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all cursor-pointer select-none",
                  isSelected
                    ? isPremium
                      ? "border-amber-500/70 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 font-bold shadow-sm shadow-amber-500/10"
                      : "border-[#ff7a1a] bg-[#ff7a1a]/15 text-[#ff7a1a] font-bold shadow-sm shadow-orange-500/10"
                    : isPremium
                      ? "border-amber-500/30 bg-amber-950/20 text-amber-400/80 hover:border-amber-500/50 hover:text-amber-300"
                      : "border-neutral-800 bg-[#0f0f11] text-neutral-400 hover:border-neutral-700 hover:text-white",
                )}
              >
                {isPremium && <Crown className="h-3 w-3 text-amber-400" />}
                <span>{category}</span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.2 text-[0.62rem]",
                    isSelected
                      ? "bg-black/40 text-white font-semibold"
                      : "bg-white/[0.04] text-neutral-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Box Grid View of All Templates ── */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800/80 bg-[#0d0d0d] px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-[#141414] mb-4 text-neutral-500">
            <Search className="h-5 w-5" />
          </div>
          <p className="text-base font-bold text-white">No templates found</p>
          <p className="mt-1 text-xs text-neutral-500">
            No templates match &ldquo;{searchQuery}&rdquo; in {selectedCategory}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="mt-4 rounded-lg border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 px-4 py-2 font-mono text-xs text-[#ff7a1a] hover:bg-[#ff7a1a]/20 transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredTemplates.map((template) => {
            const isCurrentActive = activeTemplateId === template.id;
            return (
              <TemplateBoxCard
                key={template.id}
                template={template}
                isActive={isCurrentActive}
                onSelect={() => handleSelectTemplate(template)}
                onPreview={() => setPreviewTemplate(template)}
              />
            );
          })}
        </div>
      )}

      {/* ── Fullscreen Interactive Preview Modal ── */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onApply={() => handleSelectTemplate(previewTemplate)}
        />
      )}
    </div>
  );
}

// ─── TemplateBoxCard Component ───────────────────────────────────────────────
interface TemplateBoxCardProps {
  template: CaptionTemplate;
  isActive: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateBoxCard({ template, isActive, onSelect, onPreview }: TemplateBoxCardProps) {
  const isPremium = template.category === "Premium";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-[#0d0d0f] transition-all duration-300 overflow-hidden",
        isActive
          ? "border-[#ff7a1a] shadow-[0_0_24px_-4px_rgba(255,122,26,0.3)] ring-1 ring-[#ff7a1a]"
          : isPremium
            ? "border-amber-500/30 hover:border-amber-500/60 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
            : "border-neutral-800/80 hover:border-[#ff7a1a]/50 hover:shadow-[0_8px_30px_rgba(255,122,26,0.1)]",
      )}
    >
      {/* ── Top Visual Box / Canvas Preview ── */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden bg-[#070709] border-b border-white/[0.06] flex items-center justify-center p-3 cursor-pointer select-none"
        onClick={onPreview}
      >
        {/* Cinematic Backdrop with subtle vignette & grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/30 via-neutral-950/80 to-[#050507]" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:14px_14px]" />

        {/* Floating Badges */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
          {isPremium ? (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/80 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-amber-300 shadow-sm shadow-amber-950">
              <Crown className="h-2.5 w-2.5 text-amber-400" />
              <span>PRO</span>
            </span>
          ) : template.badge === "Popular" ? (
            <span className="flex items-center gap-1 rounded-md border border-[#ff7a1a]/40 bg-[#ff7a1a]/20 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-[#ff7a1a]">
              <Flame className="h-2.5 w-2.5" />
              <span>HOT</span>
            </span>
          ) : template.badge === "New" ? (
            <span className="flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-950/80 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-sky-400">
              <span>NEW</span>
            </span>
          ) : null}

          {isActive && (
            <span className="rounded-md border border-[#ff7a1a]/60 bg-[#ff7a1a] px-2 py-0.5 font-mono text-[0.6rem] font-bold text-black uppercase">
              ACTIVE
            </span>
          )}
        </div>

        {/* Live Typography Box Preview */}
        <div className="relative z-10 w-full flex items-center justify-center transform transition-transform duration-300 group-hover:scale-[1.04]">
          <BoxVisualRenderer template={template} />
        </div>

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-[0.65rem] font-bold tracking-wider text-white uppercase backdrop-blur-md transition-colors hover:bg-white/20 cursor-pointer"
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#ff7a1a] px-3 py-1.5 font-mono text-[0.65rem] font-bold tracking-wider text-black uppercase shadow-lg shadow-orange-500/30 transition-all hover:bg-[#ff5b00] active:scale-95 cursor-pointer"
          >
            <Check className="h-3 w-3" />
            <span>Use</span>
          </button>
        </div>
      </div>

      {/* ── Card Body / Metadata ── */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3.5">
        <div>
          {/* Title & Category Row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-white group-hover:text-[#ff7a1a] transition-colors">
              {template.name}
            </h3>
            <span className="shrink-0 rounded-md bg-neutral-800/80 px-2 py-0.5 font-mono text-[0.6rem] text-neutral-400">
              {template.category}
            </span>
          </div>

          {/* Description */}
          <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.58rem] text-neutral-400"
            >
              #{tag}
            </span>
          ))}
          {template.style.fontFamily && (
            <span className="rounded bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 font-mono text-[0.58rem] text-neutral-500">
              {template.style.fontFamily}
            </span>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer",
              isActive
                ? "bg-[#ff7a1a]/15 text-[#ff7a1a] border border-[#ff7a1a]/40"
                : "bg-white/[0.06] text-white hover:bg-[#ff7a1a] hover:text-black border border-white/[0.08] hover:border-[#ff7a1a]",
            )}
          >
            <span>{isActive ? "Selected" : "Use Template"}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BoxVisualRenderer Component ─────────────────────────────────────────────
function BoxVisualRenderer({ template }: { template: CaptionTemplate }) {
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
      <div className="flex h-full w-full items-center justify-center overflow-hidden pointer-events-none scale-75 origin-center">
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
          scale={0.55}
          isCardPreview={true}
        />
      </div>
    );
  }

  // Regular template scaled css
  const baseFontSize = style.fontSize ?? DEFAULT_CAPTION_STYLE.fontSize;
  const scaledFontSize = Math.max(10, Math.min(baseFontSize * 0.44, 17));

  const previewCss = captionStyleToCSS({
    ...DEFAULT_CAPTION_STYLE,
    ...style,
    fontSize: scaledFontSize,
  });

  const primary = sampleText.primary;
  const accent = sampleText.accent;
  const highlightColor = style.highlightColor || "#ff7a1a";
  const accentStyle = style.accentStyle;

  if (!accent) {
    return (
      <div
        style={previewCss}
        className="max-w-full truncate text-center pointer-events-none select-none"
      >
        {primary}
      </div>
    );
  }

  const accentIndex = primary.indexOf(accent);
  if (accentIndex === -1) {
    return (
      <div
        style={previewCss}
        className="flex flex-col items-center gap-0.5 text-center pointer-events-none select-none"
      >
        <span>{primary}</span>
        <span
          style={{
            color: highlightColor,
            ...(accentStyle === "glow-word"
              ? { textShadow: `0 0 10px ${highlightColor}` }
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

  return (
    <div
      style={previewCss}
      className="max-w-full text-center pointer-events-none select-none"
    >
      <span>{before}</span>
      <span
        style={{
          color: highlightColor,
          ...(accentStyle === "glow-word"
            ? { textShadow: `0 0 12px ${highlightColor}, 0 0 24px ${highlightColor}` }
            : {}),
          ...(accentStyle === "script" && style.secondaryFontFamily
            ? {
                fontFamily: `"${style.secondaryFontFamily}", cursive`,
                fontStyle: "italic" as const,
              }
            : {}),
          ...(accentStyle === "circle-oval"
            ? {
                border: `1.5px solid ${highlightColor}`,
                borderRadius: "9999px",
                padding: "0 6px",
                boxShadow: `0 0 8px ${highlightColor}40`,
              }
            : {}),
        }}
      >
        {accent}
      </span>
      <span>{after}</span>
    </div>
  );
}

// ─── TemplatePreviewModal Component ─────────────────────────────────────────
interface TemplatePreviewModalProps {
  template: CaptionTemplate;
  onClose: () => void;
  onApply: () => void;
}

function TemplatePreviewModal({ template, onClose, onApply }: TemplatePreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [aspect, setAspect] = useState<"vertical" | "widescreen">("vertical");
  const [wordHighlightIdx, setWordHighlightIdx] = useState(0);

  const sampleWords = useMemo(() => {
    return template.sampleText.primary.split(/\s+/).filter(Boolean);
  }, [template]);

  // Simulate active word highlight cycling
  useEffect(() => {
    if (!isPlaying || sampleWords.length === 0) return;
    const interval = setInterval(() => {
      setWordHighlightIdx((prev) => (prev + 1) % sampleWords.length);
    }, 550);
    return () => clearInterval(interval);
  }, [isPlaying, sampleWords.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0d0d10] p-5 sm:p-7 z-10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{template.name}</h2>
              <span className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-[0.65rem] text-neutral-300">
                {template.category}
              </span>
              {template.category === "Premium" && (
                <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-[0.62rem] text-amber-300 font-bold">
                  PRO
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">{template.description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Stage & Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Interactive Simulated Screen */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Viewport Aspect Controls */}
            <div className="mb-3 flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAspect("vertical")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-[0.65rem] transition-colors cursor-pointer",
                  aspect === "vertical"
                    ? "bg-[#ff7a1a] text-black font-bold"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                <Smartphone className="h-3 w-3" />
                <span>9:16 Shorts / Reels</span>
              </button>
              <button
                type="button"
                onClick={() => setAspect("widescreen")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-[0.65rem] transition-colors cursor-pointer",
                  aspect === "widescreen"
                    ? "bg-[#ff7a1a] text-black font-bold"
                    : "text-neutral-400 hover:text-white",
                )}
              >
                <Monitor className="h-3 w-3" />
                <span>16:9 Video</span>
              </button>
            </div>

            {/* Screen Mockup */}
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 border-neutral-700/60 bg-[#050507] shadow-2xl flex items-center justify-center p-4 transition-all duration-300",
                aspect === "vertical" ? "w-[240px] sm:w-[260px] aspect-[9/16]" : "w-full aspect-[16/9]",
              )}
            >
              {/* Cinematic sample video backdrop graphic */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-neutral-900/40 to-black/60 pointer-events-none" />
              <div className="absolute inset-0 bg-radial from-transparent to-black/80 pointer-events-none" />

              {/* Subtitle Render Stage */}
              <div className="relative z-10 w-full px-2 text-center">
                {template.style.layoutPreset ? (
                  <PremiumSubtitleRenderer
                    layoutPreset={template.style.layoutPreset}
                    captionStyle={{
                      ...DEFAULT_CAPTION_STYLE,
                      ...template.style,
                    }}
                    words={sampleWords.map((text, idx) => ({
                      text,
                      active: idx === wordHighlightIdx,
                    }))}
                    kickerText={template.sampleText.kicker}
                    heroText={template.sampleText.hero}
                    secondaryText={template.sampleText.secondary}
                    scale={aspect === "vertical" ? 0.75 : 0.9}
                  />
                ) : (
                  <div
                    style={captionStyleToCSS({
                      ...DEFAULT_CAPTION_STYLE,
                      ...template.style,
                      fontSize: aspect === "vertical" ? 18 : 24,
                    })}
                    className="flex flex-wrap justify-center gap-x-2 gap-y-1"
                  >
                    {sampleWords.map((word, i) => {
                      const isActive = i === wordHighlightIdx;
                      return (
                        <span
                          key={i}
                          style={{
                            color: isActive
                              ? template.style.highlightColor || "#ff7a1a"
                              : template.style.textColor || "#ffffff",
                            ...(isActive && {
                              textShadow: `0 0 14px ${template.style.highlightColor || "#ff7a1a"}`,
                              transform: "scale(1.08)",
                              display: "inline-block",
                              transition: "all 0.15s ease",
                            }),
                          }}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Playback simulation overlay */}
              <button
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                className="absolute bottom-3 left-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Right: Technical Typography Specs */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="font-mono text-xs font-bold tracking-[0.16em] text-neutral-400 uppercase flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#ff7a1a]" />
              <span>Style Specifications</span>
            </h4>

            <div className="rounded-xl border border-neutral-800 bg-[#121214] p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5" />
                  Primary Font
                </span>
                <span className="text-white font-bold">{template.style.fontFamily || "Geist"}</span>
              </div>

              {template.style.secondaryFontFamily && (
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                  <span className="text-neutral-500">Secondary Font</span>
                  <span className="text-amber-400">{template.style.secondaryFontFamily}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  Highlight Accent
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: template.style.highlightColor || "#ff7a1a" }}
                  />
                  <span className="text-neutral-300 uppercase">
                    {template.style.highlightColor || "#ff7a1a"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="text-neutral-500">Font Weight</span>
                <span className="text-neutral-300">{template.style.fontWeight || 800}</span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5" />
                  Animation
                </span>
                <span className="text-[#ff7a1a] uppercase">{template.style.animation || "Word Highlight"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Layout System</span>
                <span className="text-neutral-300">
                  {template.style.layoutPreset ? "Multi-layer Preset" : "Dynamic Single Track"}
                </span>
              </div>
            </div>

            {/* Apply Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={onApply}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] py-3 px-4 font-mono text-xs font-bold tracking-[0.14em] text-black uppercase shadow-lg shadow-orange-500/20 transition-all hover:bg-[#ff5b00] active:scale-[0.99] cursor-pointer"
              >
                <span>Use This Template in Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-center text-[0.68rem] text-neutral-500">
                You can further adjust fonts, colors, and sizes at any time in the editor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
