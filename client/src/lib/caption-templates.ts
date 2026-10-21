/**
 * ProCaptioner — Built-in Caption Template Library & Preset System
 *
 * Centralized, structured template configuration.
 * Applied directly to Editor state, Live Canvas preview, Timeline, and Video Export.
 */

import type { CaptionStyle } from "./editor-store";

export type TemplateCategory =
  | "All"
  | "Premium"
  | "Trending"
  | "Minimal"
  | "Bold"
  | "Cinematic"
  | "Social"
  | "Neon"
  | "Classic"
  | "Elegant";

export interface CaptionTemplate {
  id: string;
  name: string;
  category: Exclude<TemplateCategory, "All">;
  badge?: "New" | "Pro" | "Popular";
  tags: string[];
  description: string;
  sampleText: {
    primary: string;
    accent?: string;
    secondary?: string;
    kicker?: string;
    hero?: string;
    topMasthead?: string;
  };
  style: Partial<CaptionStyle>;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "All",
  "Premium",
  "Trending",
  "Minimal",
  "Bold",
  "Cinematic",
  "Social",
  "Neon",
  "Classic",
  "Elegant",
];

// ─── Premium Template Collection (10 High-End Presets) ──────────────────────

export const PREMIUM_TEMPLATES: CaptionTemplate[] = [
  // 01. Editorial Bold / Magazine Cover
  {
    id: "editorial-bold",
    name: "Editorial Bold",
    category: "Premium",
    badge: "Pro",
    tags: ["Serif", "Bold", "Cinematic"],
    description: "Magazine masthead background title with dynamic spoken subtitles.",
    sampleText: {
      primary: "your IDEAS",
      kicker: "your",
      hero: "IDEAS",
      topMasthead: "BEST",
      accent: "IDEAS",
    },
    style: {
      fontFamily: "Playfair Display",
      secondaryFontFamily: "Inter",
      fontWeight: 900,
      fontSize: 36,
      alignment: "center",
      position: "bottom",
      yOffset: 78,
      textColor: "#fef08a",
      highlightColor: "#fef08a",
      secondaryTextColor: "#fef08a",
      bgColor: "transparent",
      bgOpacity: 0,
      stylePreset: "Editorial Bold",
      layoutPreset: "editorial-bold",
      isPremium: true,
      letterSpacing: -0.01,
      lineHeight: 1.15,
      mastheadText: "BEST",
      textShadow: "0 4px 20px rgba(0,0,0,0.92), 0 0 35px rgba(254,240,138,0.3)",
      borderRadius: 0,
      padding: "0px",
      animation: "fade",
      wordsPerCaption: 3,
      tags: ["Serif", "Bold", "Cinematic"],
    },
  },

  // 02. Golden Frame
  {
    id: "golden-frame",
    name: "Golden Frame",
    category: "Premium",
    badge: "Pro",
    tags: ["Frame", "Elegant", "Clean"],
    description: "Elegant frame with premium typography and clean layout.",
    sampleText: {
      primary: "Small steps create BIG CHANGES",
      kicker: "Small steps create",
      hero: "BIG CHANGES",
      accent: "BIG CHANGES",
    },
    style: {
      fontFamily: "Cinzel",
      secondaryFontFamily: "Inter",
      fontWeight: 800,
      fontSize: 36,
      alignment: "center",
      position: "bottom",
      yOffset: 65,
      textColor: "#fef08a",
      highlightColor: "#f59e0b",
      secondaryTextColor: "#ffffff",
      bgColor: "transparent",
      bgOpacity: 0,
      stylePreset: "Golden Frame",
      layoutPreset: "golden-frame",
      isPremium: true,
      letterSpacing: 0.04,
      border: "none",
      borderRadius: 0,
      padding: "0px",
      textShadow: "0 4px 20px rgba(0,0,0,0.95), 0 0 24px rgba(245,158,11,0.35)",
      textTransform: "uppercase",
      animation: "fade",
      wordsPerCaption: 3,
      tags: ["Frame", "Elegant", "Clean"],
    },
  },

  // 03. Kinetic Focus
  {
    id: "kinetic-focus",
    name: "Kinetic Focus",
    category: "Premium",
    badge: "Pro",
    tags: ["Dynamic", "Highlight", "Energetic"],
    description: "Dynamic word emphasis with animated scaling and impact.",
    sampleText: {
      primary: "THIS IS IMPORTANT Don't miss it!",
      kicker: "THIS IS",
      hero: "IMPORTANT",
      secondary: "Don't miss it!",
      accent: "IMPORTANT",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 36,
      alignment: "center",
      position: "bottom",
      yOffset: 66,
      textColor: "#ffffff",
      highlightColor: "#22c55e",
      secondaryTextColor: "#cbd5e1",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Kinetic Focus",
      layoutPreset: "kinetic-focus",
      isPremium: true,
      textTransform: "uppercase",
      letterSpacing: -0.02,
      strokeColor: "#000000",
      strokeWidth: 2,
      textShadow: "0 4px 16px rgba(0,0,0,0.95), 0 0 20px rgba(34,197,94,0.6)",
      animation: "scale",
      wordsPerCaption: 3,
      tags: ["Dynamic", "Highlight", "Energetic"],
    },
  },

  // 04. Luxury Magazine
  {
    id: "luxury-magazine",
    name: "Luxury Magazine",
    category: "Premium",
    badge: "Pro",
    tags: ["Magazine", "Premium", "Stylish"],
    description: "Editorial magazine style with asymmetric layout and elegance.",
    sampleText: {
      primary: "Live a Better Life Make it happen",
      kicker: "Live a",
      hero: "Better Life",
      secondary: "Make it happen",
      accent: "Better Life",
    },
    style: {
      fontFamily: "Playfair Display",
      secondaryFontFamily: "Inter",
      fontWeight: 700,
      fontSize: 34,
      fontStyle: "italic",
      alignment: "left",
      position: "bottom",
      yOffset: 62,
      textColor: "#ffffff",
      highlightColor: "#f5d0fe",
      secondaryTextColor: "#94a3b8",
      bgColor: "#09090b",
      bgOpacity: 0.45,
      backdropFilter: "blur(10px)",
      borderRadius: 4,
      padding: "10px 22px",
      stylePreset: "Luxury Magazine",
      layoutPreset: "luxury-magazine",
      isPremium: true,
      letterSpacing: 0.02,
      textShadow: "0 3px 12px rgba(0,0,0,0.85)",
      animation: "slide",
      wordsPerCaption: 3,
      tags: ["Magazine", "Premium", "Stylish"],
    },
  },

  // 05. Creator Podcast
  {
    id: "creator-podcast",
    name: "Creator Podcast",
    category: "Premium",
    badge: "Pro",
    tags: ["Podcast", "Bold", "Clear"],
    description: "Strong centered typography with highlighted keywords.",
    sampleText: {
      primary: "IDEAS Build Better Every Day",
      kicker: "IDEAS",
      hero: "Build Better",
      secondary: "Every Day",
      accent: "Build Better",
    },
    style: {
      fontFamily: "Geist",
      secondaryFontFamily: "Inter",
      fontWeight: 900,
      fontSize: 34,
      alignment: "center",
      position: "bottom",
      yOffset: 65,
      textColor: "#ffffff",
      highlightColor: "#8b5cf6",
      secondaryTextColor: "#a1a1aa",
      bgColor: "#0c0a09",
      bgOpacity: 0.75,
      borderRadius: 12,
      padding: "8px 20px",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
      stylePreset: "Creator Podcast",
      layoutPreset: "creator-podcast",
      isPremium: true,
      letterSpacing: -0.02,
      textShadow: "0 2px 8px rgba(0,0,0,0.9)",
      animation: "pop",
      wordsPerCaption: 2,
      tags: ["Podcast", "Bold", "Clear"],
    },
  },

  // 06. Minimal Statement
  {
    id: "minimal-statement",
    name: "Minimal Statement",
    category: "Premium",
    badge: "Pro",
    tags: ["Minimal", "Clean", "Modern"],
    description: "Clean, minimal design with huge typography and ample whitespace.",
    sampleText: {
      primary: "DREAM PLAN DO The right time is now.",
      kicker: "DREAM",
      hero: "PLAN DO",
      secondary: "The right time is now.",
      accent: "DO",
    },
    style: {
      fontFamily: "Inter",
      fontWeight: 900,
      fontSize: 38,
      alignment: "left",
      position: "bottom",
      yOffset: 60,
      textColor: "#f8fafc",
      highlightColor: "#38bdf8",
      secondaryTextColor: "#94a3b8",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Minimal Statement",
      layoutPreset: "minimal-statement",
      isPremium: true,
      textTransform: "uppercase",
      letterSpacing: -0.03,
      lineHeight: 1.05,
      textShadow: "0 4px 16px rgba(0,0,0,0.9)",
      animation: "fade",
      wordsPerCaption: 3,
      tags: ["Minimal", "Clean", "Modern"],
    },
  },

  // 07. Split Word
  {
    id: "split-word",
    name: "Split Word",
    category: "Premium",
    badge: "Pro",
    tags: ["Experimental", "Modern", "Creative"],
    description: "Sentence split across multiple areas with controlled asymmetry.",
    sampleText: {
      primary: "THE WAY YOU THINK",
      kicker: "THE",
      hero: "WAY",
      secondary: "YOU THINK",
      accent: "YOU THINK",
    },
    style: {
      fontFamily: "Anton",
      secondaryFontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 36,
      alignment: "center",
      position: "bottom",
      yOffset: 65,
      textColor: "#ffffff",
      highlightColor: "#facc15",
      secondaryTextColor: "#facc15",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Split Word",
      layoutPreset: "split-word",
      isPremium: true,
      textTransform: "uppercase",
      letterSpacing: 0.04,
      strokeColor: "#000000",
      strokeWidth: 1.5,
      textShadow: "3px 3px 0 #000000, 0 6px 16px rgba(0,0,0,0.85)",
      animation: "slide",
      wordsPerCaption: 3,
      tags: ["Experimental", "Modern", "Creative"],
    },
  },

  // 08. Cinematic Quote
  {
    id: "cinematic-quote",
    name: "Cinematic Quote",
    category: "Premium",
    badge: "Pro",
    tags: ["Cinematic", "Elegant", "Calm"],
    description: "Film-style typography with cinematic spacing and elegance.",
    sampleText: {
      primary: "SUCCESS IS A JOURNEY Not a destination",
      kicker: "SUCCESS IS A",
      hero: "JOURNEY",
      secondary: "Not a destination",
      accent: "JOURNEY",
    },
    style: {
      fontFamily: "Cinzel",
      secondaryFontFamily: "Lora",
      fontWeight: 700,
      fontSize: 32,
      alignment: "center",
      position: "bottom",
      yOffset: 66,
      textColor: "#f5f5f4",
      highlightColor: "#fde047",
      secondaryTextColor: "#a8a29e",
      bgColor: "#050505",
      bgOpacity: 0.5,
      stylePreset: "Cinematic Quote",
      layoutPreset: "cinematic-quote",
      isPremium: true,
      textTransform: "uppercase",
      letterSpacing: 0.22,
      lineHeight: 1.35,
      textShadow: "0 2px 14px rgba(253,224,71,0.35), 0 4px 8px rgba(0,0,0,0.9)",
      padding: "8px 22px",
      animation: "fade",
      wordsPerCaption: 3,
      tags: ["Cinematic", "Elegant", "Calm"],
    },
  },

  // 09. Dynamic Highlight
  {
    id: "dynamic-highlight",
    name: "Dynamic Highlight",
    category: "Premium",
    badge: "Pro",
    tags: ["Highlight", "Bold", "Energetic"],
    description: "Standard subtitle text with highlighted keywords/phrases.",
    sampleText: {
      primary: "YOU NEED TO START NOW Make it count!",
      kicker: "YOU NEED TO",
      hero: "START NOW",
      secondary: "Make it count!",
      accent: "START NOW",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 34,
      alignment: "center",
      position: "bottom",
      yOffset: 66,
      textColor: "#ffffff",
      highlightColor: "#f59e0b",
      secondaryTextColor: "#e2e8f0",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Dynamic Highlight",
      layoutPreset: "dynamic-highlight",
      isPremium: true,
      textTransform: "uppercase",
      letterSpacing: -0.01,
      strokeColor: "#000000",
      strokeWidth: 2,
      textShadow: "0 4px 14px rgba(0,0,0,0.9)",
      accentStyle: "marker-pill",
      animation: "pop",
      wordsPerCaption: 3,
      tags: ["Highlight", "Bold", "Energetic"],
    },
  },

  // 10. Vertical Premium
  {
    id: "vertical-premium",
    name: "Vertical Premium",
    category: "Premium",
    badge: "Pro",
    tags: ["Vertical", "Modern", "Trendy"],
    description: "Designed specifically for Reels, Shorts and mobile screens (9:16).",
    sampleText: {
      primary: "Create Your Own story Be Unique",
      kicker: "Create Your Own",
      hero: "story",
      secondary: "Be Unique",
      accent: "story",
    },
    style: {
      fontFamily: "Inter",
      secondaryFontFamily: "Caveat",
      fontWeight: 800,
      fontSize: 34,
      alignment: "center",
      position: "bottom",
      yOffset: 64,
      textColor: "#ffffff",
      highlightColor: "#c084fc",
      secondaryTextColor: "#cbd5e1",
      bgColor: "#09090b",
      bgOpacity: 0.6,
      borderRadius: 16,
      padding: "8px 20px",
      border: "1px solid rgba(192,132,252,0.25)",
      boxShadow: "0 8px 30px rgba(0,0,0,0.7), 0 0 20px rgba(192,132,252,0.15)",
      stylePreset: "Vertical Premium",
      layoutPreset: "vertical-premium",
      isPremium: true,
      letterSpacing: -0.01,
      textShadow: "0 0 16px rgba(192,132,252,0.6), 0 3px 8px rgba(0,0,0,0.9)",
      animation: "scale",
      wordsPerCaption: 3,
      tags: ["Vertical", "Modern", "Trendy"],
    },
  },
];

// ─── Built-in Template Library (10 Premium + 20 Classic Presets) ────────────

export const BUILT_IN_TEMPLATES: CaptionTemplate[] = [
  ...PREMIUM_TEMPLATES,

  // 1. Goa (Reference inspired)
  {
    id: "goa",
    name: "Goa",
    category: "Trending",
    badge: "New",
    tags: ["Bold", "Shadow"],
    description:
      "Bold primary text with glowing emerald cursive accent and subtle swirl decoration.",
    sampleText: {
      primary: "The quick brown",
      accent: "quick",
    },
    style: {
      fontFamily: "Geist",
      fontWeight: 800,
      fontSize: 34,
      fontStyle: "normal",
      textColor: "#ffffff",
      highlightColor: "#34d399",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Goa",
      textShadow: "0 2px 10px rgba(0,0,0,0.85)",
      letterSpacing: -0.01,
      accentStyle: "script",
      secondaryFontFamily: "Caveat",
      secondaryTextColor: "#34d399",
      tags: ["Bold", "Shadow"],
    },
  },

  // 2. Islamabad (Reference inspired)
  {
    id: "islamabad",
    name: "Islamabad",
    category: "Bold",
    badge: "New",
    tags: ["Italic", "Shadow"],
    description: "Punchy bold italic typography with high-contrast red accent ring and shadow.",
    sampleText: {
      primary: "THE QUICK BROWN FOX",
      accent: "THE QUICK",
      secondary: "jumps over the lazy dog",
    },
    style: {
      fontFamily: "Geist",
      fontWeight: 800,
      fontSize: 32,
      fontStyle: "italic",
      textTransform: "uppercase",
      textColor: "#ffffff",
      highlightColor: "#ef4444",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Islamabad",
      textShadow: "0 4px 12px rgba(0,0,0,0.9)",
      letterSpacing: 0.02,
      accentStyle: "circle-oval",
      secondaryTextColor: "#ef4444",
      tags: ["Italic", "Shadow"],
    },
  },

  // 3. Captioner Glow (Reference inspired)
  {
    id: "captioner-glow",
    name: "Captioner Glow",
    category: "Neon",
    badge: "Pro",
    tags: ["Bold", "Shadow"],
    description: "Bold white typography with intense green neon glow and multi-line hierarchy.",
    sampleText: {
      primary: "Hello and",
      accent: "WELCOME",
      secondary: "to Captioner.",
    },
    style: {
      fontFamily: "Geist",
      fontWeight: 900,
      fontSize: 36,
      textColor: "#ffffff",
      highlightColor: "#22c55e",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Captioner Glow",
      textShadow:
        "0 0 20px rgba(34,197,94,0.9), 0 0 40px rgba(34,197,94,0.5), 0 2px 4px rgba(0,0,0,0.8)",
      accentStyle: "glow-word",
      tags: ["Bold", "Shadow"],
    },
  },

  // 4. Delhi (Reference inspired)
  {
    id: "delhi",
    name: "Delhi",
    category: "Elegant",
    badge: "Pro",
    tags: ["Editorial", "Shadow"],
    description:
      "Editorial stylish serif typography with cursive accents and high-contrast ambient glow.",
    sampleText: {
      primary: "The quick brown fox",
      accent: "brown",
    },
    style: {
      fontFamily: "Playfair Display",
      fontWeight: 700,
      fontSize: 34,
      textColor: "#ffffff",
      highlightColor: "#fef08a",
      bgColor: "#000000",
      bgOpacity: 0.25,
      stylePreset: "Delhi",
      textShadow: "0 0 16px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.85)",
      letterSpacing: 0.01,
      accentStyle: "script",
      secondaryFontFamily: "Caveat",
      tags: ["Editorial", "Shadow"],
    },
  },

  // 5. Mumbai
  {
    id: "mumbai",
    name: "Mumbai",
    category: "Trending",
    badge: "Popular",
    tags: ["Vibrant", "Shadow"],
    description: "Warm Bollywood golden-orange energy with heavy uppercase weight and deep shadow.",
    sampleText: {
      primary: "BIG DREAMS RISE",
      accent: "RISE",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 34,
      textTransform: "uppercase",
      textColor: "#ffffff",
      highlightColor: "#f59e0b",
      bgColor: "#1a120b",
      bgOpacity: 0.45,
      stylePreset: "Mumbai",
      textShadow: "0 3px 12px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.9)",
      tags: ["Vibrant", "Shadow"],
    },
  },

  // 6. Punjab
  {
    id: "punjab",
    name: "Punjab",
    category: "Bold",
    badge: "New",
    tags: ["Impact", "Glow"],
    description: "Heavy impact lettering with energetic saffron gold glow and dark outline.",
    sampleText: {
      primary: "JOSH & POWER",
      accent: "POWER",
    },
    style: {
      fontFamily: "Anton",
      fontWeight: 900,
      fontSize: 38,
      textTransform: "uppercase",
      textColor: "#ffedd5",
      highlightColor: "#ea580c",
      strokeColor: "#000000",
      strokeWidth: 1.5,
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Punjab",
      textShadow: "0 0 18px rgba(234,88,12,0.8), 0 3px 6px rgba(0,0,0,0.9)",
      tags: ["Impact", "Glow"],
    },
  },

  // 7. Minimal
  {
    id: "minimal",
    name: "Minimal",
    category: "Minimal",
    tags: ["Clean", "Modern"],
    description: "Ultra-clean modern sans-serif with zero distraction and crisp letter-spacing.",
    sampleText: {
      primary: "Simplicity speaks louder.",
    },
    style: {
      fontFamily: "Inter",
      fontWeight: 400,
      fontSize: 26,
      textColor: "#f8fafc",
      highlightColor: "#38bdf8",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Minimal",
      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
      letterSpacing: -0.01,
      tags: ["Clean", "Modern"],
    },
  },

  // 8. Cinematic
  {
    id: "cinematic",
    name: "Cinematic",
    category: "Cinematic",
    tags: ["Widescreen", "Elegance"],
    description:
      "Filmic 21:9 letter-spaced typography with warm tint and refined lower-third presence.",
    sampleText: {
      primary: "EVERY FRAME MATTERS",
    },
    style: {
      fontFamily: "Playfair Display",
      fontWeight: 700,
      fontSize: 28,
      textTransform: "uppercase",
      letterSpacing: 0.12,
      textColor: "#fef3c7",
      highlightColor: "#f59e0b",
      bgColor: "#09090b",
      bgOpacity: 0.65,
      stylePreset: "Cinematic",
      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
      padding: "6px 20px",
      borderRadius: 4,
      tags: ["Widescreen", "Elegance"],
    },
  },

  // 9. Bold Pop
  {
    id: "bold-pop",
    name: "Bold Pop",
    category: "Bold",
    tags: ["Punchy", "Pop"],
    description: "Punchy high-contrast pop aesthetic with rounded black pill backdrop.",
    sampleText: {
      primary: "WATCH THIS NOW",
      accent: "NOW",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 800,
      fontSize: 32,
      textTransform: "uppercase",
      textColor: "#ffffff",
      highlightColor: "#facc15",
      bgColor: "#000000",
      bgOpacity: 0.85,
      stylePreset: "Bold Pop",
      borderRadius: 8,
      padding: "8px 18px",
      tags: ["Punchy", "Pop"],
    },
  },

  // 10. Neon
  {
    id: "neon",
    name: "Neon",
    category: "Neon",
    badge: "Popular",
    tags: ["Cyberpunk", "Glow"],
    description: "Vibrant cyberpunk neon cyan text with intense electric radiance.",
    sampleText: {
      primary: "FUTURE IS ALIVE",
      accent: "ALIVE",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 800,
      fontSize: 34,
      textTransform: "uppercase",
      textColor: "#e0f2fe",
      highlightColor: "#06b6d4",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Neon",
      textShadow: "0 0 15px #06b6d4, 0 0 30px #06b6d4, 0 0 45px rgba(6,182,212,0.6)",
      tags: ["Cyberpunk", "Glow"],
    },
  },

  // 11. Clean White
  {
    id: "clean-white",
    name: "Clean White",
    category: "Minimal",
    tags: ["Minimal", "Shadow"],
    description:
      "Pure bright white typography with subtle diffuse shadow for universal readability.",
    sampleText: {
      primary: "Pure and unmistakable.",
    },
    style: {
      fontFamily: "Inter",
      fontWeight: 500,
      fontSize: 28,
      textColor: "#ffffff",
      highlightColor: "#f97316",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Clean White",
      textShadow: "0 2px 6px rgba(0,0,0,0.85)",
      letterSpacing: -0.01,
      tags: ["Minimal", "Shadow"],
    },
  },

  // 12. YouTube Bold
  {
    id: "youtube-bold",
    name: "YouTube Bold",
    category: "Social",
    badge: "Popular",
    tags: ["Stroke", "Bold"],
    description: "Creator high-retention style: bright yellow fill with thick black outline.",
    sampleText: {
      primary: "DON'T MISS THIS",
      accent: "THIS",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 36,
      textTransform: "uppercase",
      textColor: "#fde047",
      highlightColor: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 2,
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "YouTube Bold",
      textShadow: "0 4px 0 #000000, 0 6px 12px rgba(0,0,0,0.8)",
      tags: ["Stroke", "Bold"],
    },
  },

  // 13. Instagram Reel
  {
    id: "instagram-reel",
    name: "Instagram Reel",
    category: "Social",
    badge: "Popular",
    tags: ["Pill", "Reels"],
    description: "Sleek rounded pill badge container with clean modern typography.",
    sampleText: {
      primary: "POV: You found the one",
      accent: "found",
    },
    style: {
      fontFamily: "Geist",
      fontWeight: 700,
      fontSize: 28,
      textColor: "#ffffff",
      highlightColor: "#ec4899",
      bgColor: "#18181b",
      bgOpacity: 0.8,
      borderRadius: 9999,
      padding: "6px 20px",
      border: "1px solid rgba(255,255,255,0.15)",
      stylePreset: "Instagram Reel",
      tags: ["Pill", "Reels"],
    },
  },

  // 14. Documentary
  {
    id: "documentary",
    name: "Documentary",
    category: "Classic",
    tags: ["Serif", "Editorial"],
    description: "Authoritative documentary lower-third slab with refined serif lettering.",
    sampleText: {
      primary: "The forgotten archives.",
    },
    style: {
      fontFamily: "Playfair Display",
      fontWeight: 600,
      fontSize: 28,
      textColor: "#f1f5f9",
      highlightColor: "#e2e8f0",
      bgColor: "#020617",
      bgOpacity: 0.75,
      borderRadius: 2,
      padding: "8px 16px",
      stylePreset: "Documentary",
      tags: ["Serif", "Editorial"],
    },
  },

  // 15. Modern
  {
    id: "modern",
    name: "Modern",
    category: "Trending",
    tags: ["Glass", "Clean"],
    description: "Frosted glass glassmorphism backdrop with crisp geometric sans.",
    sampleText: {
      primary: "Designed for creators.",
    },
    style: {
      fontFamily: "Inter",
      fontWeight: 600,
      fontSize: 28,
      textColor: "#ffffff",
      highlightColor: "#38bdf8",
      bgColor: "#ffffff",
      bgOpacity: 0.08,
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: 8,
      padding: "8px 18px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.37)",
      stylePreset: "Modern",
      tags: ["Glass", "Clean"],
    },
  },

  // 16. Retro
  {
    id: "retro",
    name: "Retro",
    category: "Classic",
    tags: ["80s", "Italic"],
    description: "80s synthwave nostalgia with italic slant and dual pink/cyan chromatic offset.",
    sampleText: {
      primary: "NIGHT DRIVE 1984",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 800,
      fontSize: 32,
      fontStyle: "italic",
      textTransform: "uppercase",
      textColor: "#f43f5e",
      highlightColor: "#06b6d4",
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Retro",
      textShadow: "3px 3px 0 #06b6d4, 6px 6px 0 rgba(0,0,0,0.8)",
      letterSpacing: 0.04,
      tags: ["80s", "Italic"],
    },
  },

  // 17. Typewriter
  {
    id: "typewriter",
    name: "Typewriter",
    category: "Minimal",
    tags: ["Mono", "Box"],
    description: "Terminal typewriter aesthetic with monospace font and subtle dark console box.",
    sampleText: {
      primary: "system.init_sequence()",
    },
    style: {
      fontFamily: "Geist Mono",
      fontWeight: 500,
      fontSize: 26,
      textColor: "#4ade80",
      highlightColor: "#ffffff",
      bgColor: "#050505",
      bgOpacity: 0.9,
      border: "1px solid rgba(74,222,128,0.3)",
      borderRadius: 4,
      padding: "6px 14px",
      stylePreset: "Typewriter",
      tags: ["Mono", "Box"],
    },
  },

  // 18. Luxury
  {
    id: "luxury",
    name: "Luxury",
    category: "Elegant",
    badge: "Pro",
    tags: ["Editorial", "Gold"],
    description: "High-end luxury editorial serif with champagne gold accent and wide tracking.",
    sampleText: {
      primary: "THE PRIVATE COLLECTION",
    },
    style: {
      fontFamily: "Playfair Display",
      fontWeight: 700,
      fontSize: 30,
      textTransform: "uppercase",
      letterSpacing: 0.15,
      textColor: "#fef08a",
      highlightColor: "#ca8a04",
      bgColor: "#0a0a0a",
      bgOpacity: 0.5,
      borderRadius: 2,
      padding: "8px 24px",
      textShadow: "0 2px 10px rgba(202,138,4,0.3)",
      stylePreset: "Luxury",
      tags: ["Editorial", "Gold"],
    },
  },

  // 19. Street
  {
    id: "street",
    name: "Street",
    category: "Bold",
    tags: ["Urban", "Stroke"],
    description: "Raw streetwear condensed bold font with edgy angled slant and heavy outline.",
    sampleText: {
      primary: "NO PERMISSION NEEDED",
    },
    style: {
      fontFamily: "Anton",
      fontWeight: 900,
      fontSize: 38,
      textTransform: "uppercase",
      textColor: "#ffffff",
      highlightColor: "#ef4444",
      strokeColor: "#000000",
      strokeWidth: 2,
      bgColor: "#000000",
      bgOpacity: 0.0,
      stylePreset: "Street",
      textShadow: "4px 4px 0 #ef4444",
      letterSpacing: 0.02,
      tags: ["Urban", "Stroke"],
    },
  },

  // 20. Viral
  {
    id: "viral",
    name: "Viral",
    category: "Trending",
    badge: "Popular",
    tags: ["Shorts", "Bounce"],
    description:
      "Hyper-engaging TikTok/Shorts style with ultra-bright punch words and dark backing.",
    sampleText: {
      primary: "THIS CHANGES EVERYTHING",
      accent: "EVERYTHING",
    },
    style: {
      fontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 36,
      textTransform: "uppercase",
      textColor: "#ffffff",
      highlightColor: "#22c55e",
      bgColor: "#09090b",
      bgOpacity: 0.75,
      borderRadius: 6,
      padding: "6px 16px",
      stylePreset: "Viral",
      textShadow: "0 0 12px rgba(34,197,94,0.7), 0 3px 6px rgba(0,0,0,0.8)",
      tags: ["Shorts", "Bounce"],
    },
  },
];

// ─── Query & Storage Utilities ───────────────────────────────────────────────

const USER_PRESETS_LS_KEY = "procaptioner_user_caption_presets";
const LEGACY_USER_PRESETS_LS_KEY = "vyra_user_caption_presets";

export function getBuiltInTemplates(): CaptionTemplate[] {
  return BUILT_IN_TEMPLATES;
}

export function searchTemplates(
  templates: CaptionTemplate[],
  query: string,
  category: TemplateCategory = "All",
): CaptionTemplate[] {
  let filtered = templates;

  if (category !== "All") {
    filtered = filtered.filter((t) => t.category === category);
  }

  const q = query.trim().toLowerCase();
  if (!q) return filtered;

  return filtered.filter((t) => {
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.description.toLowerCase().includes(q)
    );
  });
}

/** Load user-saved presets from localStorage */
export function loadUserPresets(): CaptionTemplate[] {
  try {
    const raw =
      localStorage.getItem(USER_PRESETS_LS_KEY) || localStorage.getItem(LEGACY_USER_PRESETS_LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CaptionTemplate[];
  } catch (_) {
    return [];
  }
}

/** Save a new user preset to localStorage */
export function saveUserPreset(name: string, style: CaptionStyle): CaptionTemplate {
  const current = loadUserPresets();
  const newPreset: CaptionTemplate = {
    id: `custom_${Date.now()}`,
    name: name.trim() || `Custom Preset ${current.length + 1}`,
    category: "Trending",
    badge: "New",
    tags: ["Custom", "Preset"],
    description: "User saved caption preset",
    sampleText: {
      primary: "The quick brown fox",
    },
    style: {
      ...style,
      stylePreset: name.trim() || `Custom Preset ${current.length + 1}`,
    },
  };

  const updated = [newPreset, ...current];
  try {
    const serialized = JSON.stringify(updated);
    localStorage.setItem(USER_PRESETS_LS_KEY, serialized);
    localStorage.setItem(LEGACY_USER_PRESETS_LS_KEY, serialized);
  } catch (_) {
    // localStorage storage limits
  }
  return newPreset;
}

/** Delete a user preset by ID */
export function deleteUserPreset(presetId: string): CaptionTemplate[] {
  const current = loadUserPresets();
  const updated = current.filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(USER_PRESETS_LS_KEY, JSON.stringify(updated));
  } catch (_) {
    // localStorage storage limits
  }
  return updated;
}
