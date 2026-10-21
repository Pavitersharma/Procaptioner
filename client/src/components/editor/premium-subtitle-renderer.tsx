/**
 * ProCaptioner — Premium Subtitle Template Renderer
 * Complete visual design systems for the 10 Premium Subtitle Templates.
 *
 * Each template implements a complete typography hierarchy, layout,
 * font pairing, animations, decorations, and responsive safe-area scaling.
 */

import React from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaptionStyle } from "@/lib/editor-store";

// ─── Authentic Luxury Ornate Corner Bracket for Golden Frame ────────────────
export function VintageCorner({
  className,
  position,
}: {
  className?: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const rotation = {
    "top-left": "rotate(0deg)",
    "top-right": "rotate(90deg)",
    "bottom-right": "rotate(180deg)",
    "bottom-left": "rotate(270deg)",
  }[position];

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "w-7 h-7 sm:w-9 sm:h-9 text-amber-400 select-none pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]",
        className,
      )}
      style={{ transform: rotation, transformOrigin: "20px 20px" }}
    >
      {/* Outer corner L-bracket with vintage rounded curve */}
      <path
        d="M 2 38 L 2 16 C 2 8 8 2 16 2 L 38 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Inward ornamental baroque bracket */}
      <path
        d="M 7 38 L 7 20 C 7 13 13 7 20 7 L 38 7"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
      {/* Decorative corner blossom / diamond flourish */}
      <circle cx="14" cy="14" r="2.2" fill="currentColor" />
      <path
        d="M 14 8 L 15.5 12.5 L 20 14 L 15.5 15.5 L 14 20 L 12.5 15.5 L 8 14 L 12.5 12.5 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

// ─── Golden Frame PRO Badge Pill ──────────────────────────────────────────────
export function GoldenProBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-400/90 bg-black/85 px-2.5 py-0.5 sm:px-3 sm:py-1 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.9)] select-none",
        className,
      )}
    >
      <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 fill-amber-400/60" />
      <span className="font-mono text-[0.6rem] sm:text-[0.66rem] font-black tracking-widest text-amber-300 uppercase">
        PRO
      </span>
    </div>
  );
}

// ─── Filigree Center Divider Ornament ──────────────────────────────────────────
export function GoldenDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 select-none", className)}>
      <div className="h-[1.5px] w-12 sm:w-20 bg-gradient-to-r from-transparent via-amber-400/80 to-amber-400" />
      <span className="text-[0.62em] text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] select-none">
        ◆
      </span>
      <div className="h-[1.5px] w-12 sm:w-20 bg-gradient-to-l from-transparent via-amber-400/80 to-amber-400" />
    </div>
  );
}

export interface PremiumSubtitleRendererProps {
  layoutPreset: string;
  captionStyle: CaptionStyle;
  words: { text: string; active?: boolean | undefined }[];
  isRTL?: boolean | undefined;
  scale?: number | undefined;
  isCardPreview?: boolean | undefined;
  className?: string | undefined;
  kickerText?: string | undefined;
  heroText?: string | undefined;
  secondaryText?: string | undefined;
}

export function PremiumSubtitleRenderer({
  layoutPreset,
  captionStyle,
  words,
  isRTL = false,
  scale = 1,
  isCardPreview = false,
  className,
  kickerText,
  heroText,
  secondaryText,
}: PremiumSubtitleRendererProps) {
  const baseFontSize = captionStyle.fontSize || 32;
  const effectiveFontSize = baseFontSize * scale;

  // Split words into semantic groups for templates that use multi-tier hierarchy
  const activeWordIdx = words.findIndex((w) => w.active);
  const targetActiveIdx = activeWordIdx >= 0 ? activeWordIdx : Math.min(1, words.length - 1);

  // Helper to split arbitrary words into Kicker, Hero, and Secondary
  const getSemanticParts = () => {
    if (words.length === 0) return { kicker: "", hero: "", secondary: "", remaining: [] };
    if (words.length === 1) {
      return {
        kicker: kickerText || "",
        hero: heroText || words[0]!.text,
        secondary: secondaryText || "",
        remaining: [],
      };
    }
    if (words.length === 2) {
      return {
        kicker: kickerText || words[0]!.text,
        hero: heroText || words[1]!.text,
        secondary: secondaryText || "",
        remaining: [],
      };
    }
    // 3 or more words
    const kicker = kickerText || words[0]!.text;
    const hero = heroText || words[1]!.text;
    const secondary =
      secondaryText ||
      words
        .slice(2)
        .map((w) => w.text)
        .join(" ");
    return { kicker, hero, secondary, remaining: words.slice(2) };
  };

  const semantic = getSemanticParts();

  // Helper to split words for Golden Frame
  const getGoldenFrameParts = () => {
    if (kickerText || heroText) {
      const kickerLines = (kickerText || "").split(/\s+/).filter(Boolean);
      const heroLines = (heroText || "").split(/\s+/).filter(Boolean);
      return { kickerLines, heroLines };
    }

    if (words.length === 0) {
      return { kickerLines: ["Small", "steps", "create"], heroLines: ["BIG", "CHANGES"] };
    }
    if (words.length === 1) {
      return { kickerLines: [], heroLines: [words[0]!.text] };
    }
    if (words.length === 2) {
      return { kickerLines: [words[0]!.text], heroLines: [words[1]!.text] };
    }
    if (words.length === 3) {
      return { kickerLines: [words[0]!.text], heroLines: [words[1]!.text, words[2]!.text] };
    }
    const splitPoint = Math.min(3, Math.floor(words.length / 2));
    const kickerLines = words.slice(0, splitPoint).map((w) => w.text);
    const heroLines = words.slice(splitPoint).map((w) => w.text);
    return { kickerLines, heroLines };
  };

  switch (layoutPreset) {
    // ──────────────────────────────────────────────────────────────────────────
    // 01. EDITORIAL BOLD (High-Fashion Cinematic Magazine Typography)
    // ──────────────────────────────────────────────────────────────────────────
    case "editorial-bold": {
      const masthead = captionStyle.mastheadText || "BEST";
      const butterYellow = captionStyle.highlightColor || captionStyle.textColor || "#fef08a";

      // Card Preview Mode: Exact match to user's demo attachment
      if (isCardPreview) {
        return (
          <div
            className="relative flex h-full w-full flex-col justify-between p-3 select-none overflow-hidden rounded-xl bg-cover bg-center"
            style={{
              backgroundImage: "url('/magazine-demo.jpg')",
              backgroundColor: "#16141a",
            }}
          >
            {/* Subtle dark vignette to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60 pointer-events-none" />

            {/* Top Bar: Left Selection Checkmark */}
            <div className="relative z-20 flex items-start justify-between w-full pointer-events-none">
              <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#4f46e5] text-white shadow-md ring-2 ring-white/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* Bottom Spoken Subtitle: "your IDEAS" */}
            <div className="relative z-20 w-full text-center mb-2 flex items-baseline justify-center gap-1.5">
              <span
                className="font-serif font-normal italic text-[1.1em] lowercase"
                style={{
                  fontFamily: `"${captionStyle.fontFamily || "Playfair Display"}", Georgia, serif`,
                  color: butterYellow,
                  textShadow: "0 3px 14px rgba(0,0,0,0.95)",
                }}
              >
                {kickerText || "your"}
              </span>
              <span
                className="font-serif font-black tracking-tight text-[1.4em] uppercase"
                style={{
                  fontFamily: `"${captionStyle.fontFamily || "Playfair Display"}", "Cinzel", Georgia, serif`,
                  color: butterYellow,
                  textShadow: "0 4px 18px rgba(0,0,0,0.95), 0 0 20px rgba(254,240,138,0.4)",
                }}
              >
                {heroText || "IDEAS"}
              </span>
            </div>
          </div>
        );
      }

      // Live Video Canvas Mode: Spoken subtitles in lower-third with lowercase lead and bold serif
      const rawWordsList =
        words.length > 0
          ? words
          : [
              { text: "your", active: false },
              { text: "IDEAS", active: true },
            ];
      const leadWord = rawWordsList[0]?.text || "your";
      const trailingWords = rawWordsList.length > 1 ? rawWordsList.slice(1) : [];

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="relative inline-flex flex-wrap items-baseline justify-center gap-2 px-4 py-2">
            {rawWordsList.length > 1 ? (
              <>
                <span
                  className={cn(
                    "font-serif font-normal italic tracking-wide lowercase transition-all duration-100",
                    rawWordsList[0]?.active && "scale-105 font-medium",
                  )}
                  style={{
                    fontFamily: `"${captionStyle.fontFamily || "Playfair Display"}", Georgia, serif`,
                    fontSize: "0.88em",
                    color: butterYellow,
                    textShadow: rawWordsList[0]?.active
                      ? "0 0 24px rgba(254,240,138,0.95), 0 4px 16px rgba(0,0,0,0.95)"
                      : "0 3px 14px rgba(0,0,0,0.95)",
                  }}
                >
                  {leadWord}
                </span>

                <div className="inline-flex flex-wrap items-baseline gap-x-2">
                  {trailingWords.map((w, wi) => (
                    <span
                      key={wi}
                      className={cn(
                        "font-serif font-black tracking-tight uppercase transition-all duration-100",
                        w.active && "scale-105",
                      )}
                      style={{
                        fontFamily: `"${captionStyle.fontFamily || "Playfair Display"}", "Cinzel", Georgia, serif`,
                        fontSize: "1.25em",
                        color: butterYellow,
                        textShadow: w.active
                          ? "0 0 28px rgba(254,240,138,0.95), 0 4px 18px rgba(0,0,0,0.95)"
                          : "0 4px 18px rgba(0,0,0,0.95)",
                      }}
                    >
                      {w.text}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span
                className="font-serif font-black tracking-tight uppercase"
                style={{
                  fontFamily: `"${captionStyle.fontFamily || "Playfair Display"}", "Cinzel", Georgia, serif`,
                  fontSize: "1.25em",
                  color: butterYellow,
                  textShadow: "0 4px 18px rgba(0,0,0,0.95), 0 0 25px rgba(254,240,138,0.4)",
                }}
              >
                {leadWord}
              </span>
            )}
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 02. GOLDEN FRAME (Exact Reference Match: Vintage Frame, PRO Badge, Stacked Hero)
    // ──────────────────────────────────────────────────────────────────────────
    case "golden-frame": {
      const gf = getGoldenFrameParts();
      const goldGradientStyle: React.CSSProperties = {
        fontFamily: `"${captionStyle.fontFamily || "Cinzel"}", "Playfair Display", Georgia, serif`,
        background: "linear-gradient(180deg, #fffbeb 0%, #fef08a 25%, #f59e0b 60%, #b45309 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        filter:
          "drop-shadow(0 4px 18px rgba(0,0,0,0.95)) drop-shadow(0 0 20px rgba(245,158,11,0.35))",
      };

      // Card Preview Mode: Render complete self-contained framed card matching screenshot
      if (isCardPreview) {
        return (
          <div className="relative flex h-full w-full flex-col items-center justify-center p-3 select-none overflow-hidden rounded-xl bg-gradient-to-b from-[#16141a] via-[#0d0d10] to-[#070709]">
            {/* Inset Gold Border with authentic vintage corners */}
            <div className="absolute inset-2 sm:inset-2.5 border-[1.25px] border-amber-400/80 pointer-events-none rounded-[1px] shadow-[inset_0_0_16px_rgba(245,158,11,0.12)]">
              <VintageCorner
                position="top-left"
                className="absolute -top-1.5 -left-1.5 w-6 h-6 text-amber-400"
              />
              <VintageCorner
                position="top-right"
                className="absolute -top-1.5 -right-1.5 w-6 h-6 text-amber-400"
              />
              <VintageCorner
                position="bottom-left"
                className="absolute -bottom-1.5 -left-1.5 w-6 h-6 text-amber-400"
              />
              <VintageCorner
                position="bottom-right"
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 text-amber-400"
              />
            </div>

            {/* Typography: Stacked kicker on left + Giant gold serif hero */}
            <div className="relative z-10 flex items-center justify-center gap-3 px-3 py-1.5">
              {gf.kickerLines.length > 0 && (
                <div className="flex flex-col items-start leading-[1.15] text-left">
                  {gf.kickerLines.map((line, i) => (
                    <span
                      key={i}
                      className="font-sans font-medium text-[0.62em] tracking-wide text-white/95 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                      style={{
                        fontFamily: `"${captionStyle.secondaryFontFamily || "Inter"}", sans-serif`,
                      }}
                    >
                      {line}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-start">
                <div className="flex flex-col items-start leading-[0.88] text-left">
                  {gf.heroLines.map((line, i) => (
                    <span
                      key={i}
                      className="font-serif font-black tracking-tight uppercase text-[1.6em]"
                      style={goldGradientStyle}
                    >
                      {line}
                    </span>
                  ))}
                </div>
                <GoldenDivider className="mt-1.5 w-full scale-90 origin-left" />
              </div>
            </div>
          </div>
        );
      }

      // Live Video Canvas Mode: Clean floating majestic typography with metallic gold shine
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="relative inline-flex flex-col items-center px-4 py-2">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              {gf.kickerLines.length > 0 && (
                <div className="flex flex-col items-start leading-[1.15] text-left">
                  {gf.kickerLines.map((line, i) => (
                    <span
                      key={i}
                      className="font-sans font-medium text-[0.68em] tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
                      style={{
                        fontFamily: `"${captionStyle.secondaryFontFamily || "Inter"}", sans-serif`,
                      }}
                    >
                      {line}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-start">
                <div className="flex flex-col items-start leading-[0.88] text-left">
                  {gf.heroLines.map((line, i) => (
                    <span
                      key={i}
                      className="font-serif font-black tracking-tight uppercase text-[2.2em] sm:text-[2.6em] transition-transform duration-100"
                      style={goldGradientStyle}
                    >
                      {line}
                    </span>
                  ))}
                </div>
                <GoldenDivider className="mt-2 w-full max-w-[240px]" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 03. KINETIC FOCUS
    // ──────────────────────────────────────────────────────────────────────────
    case "kinetic-focus": {
      return (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-[0.35em] gap-y-[0.15em] text-center select-none",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            fontFamily: `"${captionStyle.fontFamily || "Montserrat"}", sans-serif`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {words.map((w, wi) => {
            const isFocal = wi === targetActiveIdx;
            return (
              <span
                key={wi}
                className={cn(
                  "relative inline-block uppercase transition-all duration-100",
                  isFocal ? "z-10 font-black" : "font-extrabold text-white",
                )}
                style={{
                  transform: isFocal ? "scale(1.5) skewX(-4deg)" : "scale(1)",
                  color: isFocal ? captionStyle.highlightColor || "#22c55e" : "#ffffff",
                  WebkitTextStroke: isFocal ? "0px" : "1.5px black",
                  paintOrder: "stroke fill",
                  textShadow: isFocal
                    ? "0 0 24px rgba(34,197,94,0.85), 0 4px 12px rgba(0,0,0,0.95)"
                    : "0 3px 8px rgba(0,0,0,0.9)",
                  ...(isFocal &&
                  captionStyle.highlightGradientStart &&
                  captionStyle.highlightGradientEnd
                    ? {
                        background: `linear-gradient(to right, ${captionStyle.highlightGradientStart}, ${captionStyle.highlightGradientEnd})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                      }
                    : {}),
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 04. LUXURY MAGAZINE
    // ──────────────────────────────────────────────────────────────────────────
    case "luxury-magazine": {
      return (
        <div
          className={cn(
            "flex flex-col items-start select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="relative inline-flex flex-col items-start rounded-xl bg-black/55 px-6 py-3.5 backdrop-blur-md border border-white/[0.08] shadow-2xl">
            {/* Top-left editorial kicker */}
            <span
              className="text-[0.45em] tracking-[0.2em] font-medium uppercase text-white/60"
              style={{
                fontFamily: `"${captionStyle.secondaryFontFamily || "Inter"}", sans-serif`,
              }}
            >
              {semantic.kicker || "Live a"}
            </span>

            {/* High-fashion flowing italic serif headline */}
            <span
              className="mt-0.5 text-[1.28em] font-bold italic tracking-normal text-white"
              style={{
                fontFamily: `"${captionStyle.fontFamily || "Playfair Display"}", serif`,
                textShadow: "0 3px 14px rgba(0,0,0,0.85)",
              }}
            >
              {semantic.hero}
            </span>

            {/* Trailing editorial caption with em-dash */}
            {semantic.secondary && (
              <span className="mt-1 self-end text-[0.48em] tracking-[0.14em] uppercase text-purple-200/80 font-mono">
                — {semantic.secondary}
              </span>
            )}
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 05. CREATOR PODCAST
    // ──────────────────────────────────────────────────────────────────────────
    case "creator-podcast": {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="relative inline-flex flex-col items-center rounded-2xl bg-[#0c0a09]/85 px-6 py-3.5 backdrop-blur-md border border-white/[0.12] shadow-2xl">
            {/* Topic label / Kicker */}
            <span className="font-mono text-[0.42em] tracking-[0.24em] font-bold uppercase text-violet-400">
              {semantic.kicker || "IDEAS"}
            </span>

            {/* Words row with glowing active badge */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-[0.3em] gap-y-[0.1em]">
              {words.map((w, wi) => {
                const isActive = wi === targetActiveIdx;
                return (
                  <span
                    key={wi}
                    className={cn(
                      "relative inline-block transition-transform duration-100",
                      isActive
                        ? "rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-white font-black shadow-lg shadow-violet-900/50 scale-105"
                        : "text-white font-extrabold",
                    )}
                    style={{
                      fontFamily: `"${captionStyle.fontFamily || "Geist"}", sans-serif`,
                      fontSize: isActive ? "1.08em" : "1em",
                      textShadow: isActive
                        ? "0 0 16px rgba(139,92,246,0.8)"
                        : "0 2px 6px rgba(0,0,0,0.8)",
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>

            {semantic.secondary && words.length <= 2 && (
              <span className="mt-1 text-[0.5em] tracking-wider uppercase text-white/50 font-mono">
                {semantic.secondary}
              </span>
            )}
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 06. MINIMAL STATEMENT
    // ──────────────────────────────────────────────────────────────────────────
    case "minimal-statement": {
      return (
        <div
          className={cn(
            "flex flex-col items-start select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            fontFamily: `"${captionStyle.fontFamily || "Inter"}", sans-serif`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="flex flex-col items-start leading-[1.05] tracking-tight">
            {words.map((w, wi) => {
              const isHighlight = wi === targetActiveIdx;
              return (
                <span
                  key={wi}
                  className="font-black uppercase transition-colors duration-100"
                  style={{
                    fontSize: "1.25em",
                    letterSpacing: "-0.03em",
                    color: isHighlight ? captionStyle.highlightColor || "#38bdf8" : "#f8fafc",
                    textShadow: "0 4px 18px rgba(0,0,0,0.92)",
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
          {semantic.secondary && (
            <span className="mt-2 text-[0.45em] font-normal tracking-wide text-white/70">
              {semantic.secondary}
            </span>
          )}
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 07. SPLIT WORD
    // ──────────────────────────────────────────────────────────────────────────
    case "split-word": {
      const firstWord = words[0]?.text || "THE";
      const secondWord = words[1]?.text || "WAY";
      const bottomPhrase =
        words.length > 2
          ? words
              .slice(2)
              .map((w) => w.text)
              .join(" ")
          : semantic.secondary || "YOU THINK";

      return (
        <div
          className={cn(
            "flex flex-col items-center select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            fontFamily: `"${captionStyle.fontFamily || "Anton"}", "Montserrat", sans-serif`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {/* Top staggered row: Left word + Right word */}
          <div className="flex w-full items-center justify-between gap-6 px-1">
            <span
              className="font-black uppercase text-white transition-transform"
              style={{
                fontSize: "1.15em",
                letterSpacing: "0.04em",
                WebkitTextStroke: "1.5px black",
                paintOrder: "stroke fill",
                textShadow: "3px 3px 0 #000000, 0 6px 16px rgba(0,0,0,0.85)",
              }}
            >
              {firstWord}
            </span>

            <span
              className="font-black uppercase text-white/90 italic transition-transform"
              style={{
                fontSize: "1.15em",
                letterSpacing: "0.04em",
                WebkitTextStroke: "1.5px black",
                paintOrder: "stroke fill",
                textShadow: "3px 3px 0 #000000, 0 6px 16px rgba(0,0,0,0.85)",
              }}
            >
              {secondWord}
            </span>
          </div>

          {/* Bottom anchored statement in vibrant amber */}
          <div className="mt-1 flex items-center justify-center">
            <span
              className="font-black uppercase transition-all"
              style={{
                fontSize: "1.28em",
                letterSpacing: "0.05em",
                color: captionStyle.highlightColor || "#facc15",
                WebkitTextStroke: "2px black",
                paintOrder: "stroke fill",
                textShadow: "4px 4px 0 #000000, 0 8px 24px rgba(250,204,21,0.45)",
              }}
            >
              {bottomPhrase}
            </span>
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 08. CINEMATIC QUOTE
    // ──────────────────────────────────────────────────────────────────────────
    case "cinematic-quote": {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="inline-flex flex-col items-center bg-black/50 px-8 py-3.5 backdrop-blur-sm rounded-lg border border-white/5">
            {/* Top wide-tracked kicker */}
            <span
              className="text-[0.45em] tracking-[0.28em] font-medium uppercase text-white/65"
              style={{
                fontFamily: `"${captionStyle.secondaryFontFamily || "Inter"}", sans-serif`,
              }}
            >
              {semantic.kicker || "SUCCESS IS A"}
            </span>

            {/* Majestic Roman Cinema Serif */}
            <span
              className="mt-1 text-[1.2em] font-bold tracking-[0.18em] uppercase"
              style={{
                fontFamily: `"${captionStyle.fontFamily || "Cinzel"}", "Playfair Display", serif`,
                color: captionStyle.highlightColor || "#fde047",
                textShadow:
                  captionStyle.textShadow ||
                  "0 2px 16px rgba(253,224,71,0.4), 0 4px 10px rgba(0,0,0,0.9)",
              }}
            >
              {semantic.hero}
            </span>

            {/* Horizontal divider rule */}
            <div className="my-1.5 flex items-center justify-center gap-2">
              <span className="h-[1px] w-10 bg-amber-400/40" />
              <span className="text-[0.42em] text-amber-400/80">✦</span>
              <span className="h-[1px] w-10 bg-amber-400/40" />
            </div>

            {/* Bottom reflective quote */}
            {semantic.secondary && (
              <span
                className="text-[0.52em] font-serif italic tracking-wide text-stone-300"
                style={{
                  fontFamily: `"${captionStyle.secondaryFontFamily || "Lora"}", Georgia, serif`,
                }}
              >
                {semantic.secondary}
              </span>
            )}
          </div>
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 09. DYNAMIC HIGHLIGHT
    // ──────────────────────────────────────────────────────────────────────────
    case "dynamic-highlight": {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center select-none",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            fontFamily: `"${captionStyle.fontFamily || "Montserrat"}", sans-serif`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-[0.35em] gap-y-[0.15em]">
            {words.map((w, wi) => {
              const isHighlighted = wi === targetActiveIdx;
              return isHighlighted ? (
                <span
                  key={wi}
                  className="relative inline-block rounded-md bg-[#f59e0b] px-2.5 py-0.5 font-black text-black uppercase shadow-lg shadow-amber-500/30 transform -rotate-1 transition-transform"
                  style={{
                    fontSize: "1.08em",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {w.text}
                </span>
              ) : (
                <span
                  key={wi}
                  className="font-black uppercase text-white"
                  style={{
                    letterSpacing: "-0.01em",
                    WebkitTextStroke: "1.5px black",
                    paintOrder: "stroke fill",
                    textShadow: "0 3px 10px rgba(0,0,0,0.9)",
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>

          {semantic.secondary && words.length <= 2 && (
            <span className="mt-1 text-[0.48em] font-semibold text-white/80">
              {semantic.secondary}
            </span>
          )}
        </div>
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. VERTICAL PREMIUM
    // ──────────────────────────────────────────────────────────────────────────
    case "vertical-premium": {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center select-none transition-all duration-150",
            className,
          )}
          style={{
            fontSize: `${effectiveFontSize}px`,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div className="relative inline-flex flex-col items-center rounded-2xl bg-[#09090b]/80 px-7 py-3.5 backdrop-blur-md border border-purple-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)] shadow-purple-950/20">
            {/* Setup kicker text */}
            <span
              className="text-[0.48em] font-bold uppercase tracking-wider text-white/85"
              style={{
                fontFamily: `"${captionStyle.fontFamily || "Inter"}", sans-serif`,
              }}
            >
              {semantic.kicker || "Create Your Own"}
            </span>

            {/* Flowing glowing neon cursive word */}
            <span
              className="mt-0.5 text-[1.38em] font-bold leading-tight"
              style={{
                fontFamily: `"${captionStyle.secondaryFontFamily || "Caveat"}", cursive`,
                color: captionStyle.highlightColor || "#c084fc",
                textShadow:
                  captionStyle.textShadow ||
                  "0 0 20px rgba(192,132,252,0.85), 0 3px 8px rgba(0,0,0,0.9)",
              }}
            >
              {semantic.hero}
            </span>

            {/* Tag badge pill */}
            <span className="mt-1.5 rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[0.4em] tracking-widest uppercase text-white/80 border border-white/10">
              {semantic.secondary || "Be Unique"}
            </span>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
