/**
 * ProCaptioner Editor — Single Source of Truth
 *
 * Architecture: React Context + useReducer
 * All editor controls read from and write to this store.
 * Changes automatically flow from State → Overlay → Export.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WordInfo {
  word: string;
  roman_word?: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SubtitleEntry {
  index: number;
  start: number;
  end: number;
  text: string;
  roman_text?: string;
  words: WordInfo[];
}

export interface CaptionStyle {
  fontFamily: string; // e.g. "Geist", "Inter", "Roboto Mono", "Caveat", "Montserrat", "Playfair Display", "Anton"
  fontWeight: number; // 400 | 500 | 600 | 700 | 800 | 900
  fontSize: number; // px, 12–96
  alignment: "left" | "center" | "right";
  position: "top" | "center" | "bottom";
  yOffset: number; // 0–100 (% from top)
  textColor: string; // hex
  highlightColor: string; // hex — active word fill
  bgColor: string; // hex
  bgOpacity: number; // 0–1
  stylePreset: string; // "Goa" | "Islamabad" | "Captioner Glow" | "Delhi" | etc.
  letterSpacing: number; // em, e.g. -0.03
  fontStyle?: "normal" | "italic" | undefined;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize" | undefined;
  lineHeight?: number | undefined;
  textShadow?: string | undefined;
  strokeColor?: string | undefined;
  strokeWidth?: number | undefined;
  boxShadow?: string | undefined;
  borderRadius?: number | undefined;
  padding?: string | undefined;
  border?: string | undefined;
  backdropFilter?: string | undefined;
  accentStyle?:
    | "none"
    | "script"
    | "circle-oval"
    | "glow-word"
    | "box"
    | "underline-swirl"
    | "marker-pill"
    | undefined;
  secondaryFontFamily?: string | undefined;
  secondaryTextColor?: string | undefined;
  animation?: "none" | "fade" | "pop" | "slide" | "scale" | "glow" | "typewriter" | undefined;
  tags?: string[] | undefined;
  /** Max words shown on screen at once (word-by-word captions). 1 = single word. */
  wordsPerCaption?: number | undefined;
  templateId?: string | undefined;
  layoutPreset?: string | undefined;
  isPremium?: boolean | undefined;
  kickerText?: string | undefined;
  heroText?: string | undefined;
  supportingText?: string | undefined;
  decorativeElements?: boolean | undefined;
  mastheadText?: string | undefined;
  highlightGradientStart?: string | undefined;
  highlightGradientEnd?: string | undefined;
}

export interface EditorState {
  // ── Source ──
  jobId: string;
  filename: string;
  subtitles: SubtitleEntry[];
  videoSrc: string;
  duration: number;
  hasSrt: boolean;
  hasVtt: boolean;
  hasBurnedVideo: boolean;
  detectedLanguage: string;
  script: "native" | "roman";

  // ── Playback ──
  currentTime: number;
  isPlaying: boolean;
  activeSubIndex: number;

  // ── Styling ──
  captionStyle: CaptionStyle;

  // ── Timeline ──
  zoom: number; // pixels per second (1–20)
  selectedSubIndex: number;

  // ── Sidebar ──
  sidebarTab: "captions" | "text" | "media";

  // ── Inspector ──
  inspectorTab: "text" | "templates" | "transitions" | "ai" | "audio";
}

// ─── Default values ───────────────────────────────────────────────────────────

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: "Geist",
  fontWeight: 700,
  fontSize: 32,
  alignment: "center",
  position: "bottom",
  yOffset: 65,
  textColor: "#ffffff",
  highlightColor: "#f97316", // amber-500 ≈ --accent
  bgColor: "#000000",
  bgOpacity: 0.55,
  stylePreset: "Punch",
  letterSpacing: -0.03,
  fontStyle: "normal",
  textTransform: "none",
  lineHeight: 1.3,
  borderRadius: 2,
  padding: "6px 14px",
  accentStyle: "none",
  animation: "none",
  textShadow: undefined,
  strokeColor: undefined,
  strokeWidth: 0,
  boxShadow: undefined,
  border: undefined,
  backdropFilter: undefined,
  secondaryFontFamily: undefined,
  secondaryTextColor: undefined,
  wordsPerCaption: 3,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export type EditorAction =
  | { type: "INIT"; payload: Partial<EditorState> }
  | { type: "SET_CURRENT_TIME"; payload: number }
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SET_ACTIVE_SUB"; payload: number }
  | { type: "SELECT_SUB"; payload: number }
  | { type: "SET_SUBTITLE_TEXT"; payload: { index: number; text: string } }
  | { type: "SET_CAPTION_STYLE"; payload: Partial<CaptionStyle> }
  | { type: "APPLY_TEMPLATE"; payload: Partial<CaptionStyle> }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SET_SCRIPT"; payload: "native" | "roman" }
  | { type: "SET_SIDEBAR_TAB"; payload: EditorState["sidebarTab"] }
  | { type: "SET_INSPECTOR_TAB"; payload: EditorState["inspectorTab"] }
  | { type: "UNDO" }
  | { type: "REDO" };

// ─── History-aware state wrapper ──────────────────────────────────────────────

interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

function createInitialState(init: Partial<EditorState>): HistoryState {
  const present: EditorState = {
    jobId: "",
    filename: "",
    subtitles: [],
    videoSrc: "",
    duration: 0,
    hasSrt: false,
    hasVtt: false,
    hasBurnedVideo: false,
    detectedLanguage: "",
    script: "native",
    currentTime: 0,
    isPlaying: false,
    activeSubIndex: -1,
    captionStyle: { ...DEFAULT_CAPTION_STYLE },
    zoom: 6,
    selectedSubIndex: -1,
    sidebarTab: "captions",
    inspectorTab: "text",
    ...init,
  };
  return { past: [], present, future: [] };
}

// Actions that should NOT push to undo history (high-frequency / non-stylistic)
const NON_HISTORY_ACTIONS = new Set<EditorAction["type"]>([
  "SET_CURRENT_TIME",
  "SET_PLAYING",
  "SET_ACTIVE_SUB",
  "SET_SIDEBAR_TAB",
  "SET_INSPECTOR_TAB",
  "UNDO",
  "REDO",
]);

function presentReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "INIT":
      return { ...state, ...action.payload };

    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.payload };

    case "SET_PLAYING":
      return { ...state, isPlaying: action.payload };

    case "SET_ACTIVE_SUB":
      return { ...state, activeSubIndex: action.payload };

    case "SELECT_SUB":
      return { ...state, selectedSubIndex: action.payload };

    case "SET_SUBTITLE_TEXT": {
      const isRoman = state.script === "roman";
      const subtitles = state.subtitles.map((s) => {
        if (s.index !== action.payload.index) return s;
        const newText = action.payload.text.trim();
        const tokens = newText.split(/\s+/).filter(Boolean);

        let newWords = [...(s.words || [])];
        if (tokens.length === 0) {
          newWords = [];
        } else if (newWords.length === tokens.length) {
          newWords = newWords.map((w, i) => ({
            ...w,
            word: tokens[i]!,
            ...(isRoman ? { roman_word: tokens[i]! } : {}),
          }));
        } else {
          const duration = Math.max(0.1, s.end - s.start);
          const step = duration / Math.max(1, tokens.length);
          newWords = tokens.map((token, i) => ({
            word: token,
            ...(isRoman ? { roman_word: token } : {}),
            start: Number((s.start + i * step).toFixed(3)),
            end: Number((s.start + (i + 1) * step).toFixed(3)),
            confidence: 1.0,
          }));
        }

        return {
          ...s,
          text: newText,
          ...(isRoman ? { roman_text: newText } : {}),
          words: newWords,
        };
      });
      return { ...state, subtitles };
    }

    case "SET_CAPTION_STYLE":
      return {
        ...state,
        captionStyle: { ...state.captionStyle, ...action.payload },
      };

    case "APPLY_TEMPLATE":
      return {
        ...state,
        captionStyle: {
          ...DEFAULT_CAPTION_STYLE,
          position: action.payload.position ?? state.captionStyle.position,
          yOffset: action.payload.yOffset ?? state.captionStyle.yOffset,
          alignment: action.payload.alignment ?? state.captionStyle.alignment,
          wordsPerCaption: action.payload.wordsPerCaption ?? state.captionStyle.wordsPerCaption,
          ...action.payload,
        },
      };

    case "SET_ZOOM":
      return { ...state, zoom: action.payload };

    case "SET_SCRIPT":
      return { ...state, script: action.payload };

    case "SET_SIDEBAR_TAB":
      return { ...state, sidebarTab: action.payload };

    case "SET_INSPECTOR_TAB":
      return { ...state, inspectorTab: action.payload };

    default:
      return state;
  }
}

function historyReducer(state: HistoryState, action: EditorAction): HistoryState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1]!;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0]!;
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }

  const newPresent = presentReducer(state.present, action);
  if (newPresent === state.present) return state;

  if (NON_HISTORY_ACTIONS.has(action.type)) {
    return { ...state, present: newPresent };
  }

  // Push to history (cap at 50 entries)
  return {
    past: [...state.past.slice(-50), state.present],
    present: newPresent,
    future: [],
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  canUndo: boolean;
  canRedo: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const LS_KEY = "procaptioner_editor_state";
const LEGACY_LS_KEY = "vyra_editor_state";

export function EditorProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: Partial<EditorState>;
}) {
  const [history, dispatch] = useReducer(historyReducer, initialState, createInitialState);

  // Autosave caption style and subtitles to localStorage and backend (debounced 1.5s)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const toSave = {
          captionStyle: history.present.captionStyle,
          script: history.present.script,
          subtitles: history.present.subtitles,
        };
        const stateStr = JSON.stringify({
          captionStyle: history.present.captionStyle,
          script: history.present.script,
        });
        localStorage.setItem(LS_KEY, stateStr);
        localStorage.setItem(LEGACY_LS_KEY, stateStr);

        if (history.present.jobId && history.present.jobId !== "demo") {
          const projectStr = JSON.stringify(toSave);
          localStorage.setItem(`procaptioner_project_${history.present.jobId}`, projectStr);
          localStorage.setItem(`vyra_project_${history.present.jobId}`, projectStr);

          // Also persist to backend
          fetch(`http://localhost:8000/api/job/${history.present.jobId}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caption_style: history.present.captionStyle,
              subtitles: history.present.subtitles,
              script: history.present.script,
            }),
          }).catch(() => {});
        }
      } catch (_) {
        // localStorage may be unavailable
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [
    history.present.captionStyle,
    history.present.script,
    history.present.subtitles,
    history.present.jobId,
  ]);

  return (
    <EditorContext.Provider
      value={{
        state: history.present,
        dispatch,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within <EditorProvider>");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Load saved style preferences from localStorage (call on mount) */
export function loadSavedEditorPrefs(jobId?: string): Partial<EditorState> {
  try {
    if (jobId) {
      const projectRaw =
        localStorage.getItem(`procaptioner_project_${jobId}`) ||
        localStorage.getItem(`vyra_project_${jobId}`);
      if (projectRaw) {
        return JSON.parse(projectRaw) as Partial<EditorState>;
      }
    }
    const raw = localStorage.getItem(LS_KEY) || localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<EditorState>;
  } catch (_) {
    return {};
  }
}

/** Build inline CSS from caption style for the overlay element */
export function captionStyleToCSS(cs: CaptionStyle): React.CSSProperties {
  const css: React.CSSProperties = {
    fontFamily: `"${cs.fontFamily}", ui-sans-serif, system-ui, sans-serif`,
    fontWeight: cs.fontWeight,
    fontSize: `${cs.fontSize}px`,
    textAlign: cs.alignment,
    letterSpacing: `${cs.letterSpacing}em`,
    color: cs.textColor,
    backgroundColor: hexToRgba(cs.bgColor, cs.bgOpacity),
    padding: cs.padding || "6px 14px",
    borderRadius: cs.borderRadius !== undefined ? `${cs.borderRadius}px` : "2px",
    lineHeight: cs.lineHeight ?? 1.3,
    fontStyle: cs.fontStyle ?? "normal",
    textTransform: cs.textTransform ?? "none",
    // Paint stroke behind fill so variable font internal overlapping contour segments
    // (e.g. crossbars on 'H' and 'A' in Geist, Inter, Montserrat) are covered cleanly
    paintOrder: "stroke fill",
  };

  if (cs.textShadow) {
    css.textShadow = cs.textShadow;
  }
  if (cs.strokeWidth && cs.strokeWidth > 0 && cs.strokeColor) {
    (css as Record<string, unknown>)["WebkitTextStroke"] = `${cs.strokeWidth}px ${cs.strokeColor}`;
  }
  if (cs.boxShadow) {
    css.boxShadow = cs.boxShadow;
  }
  if (cs.border) {
    css.border = cs.border;
  }
  if (cs.backdropFilter) {
    css.backdropFilter = cs.backdropFilter;
    (css as Record<string, unknown>)["WebkitBackdropFilter"] = cs.backdropFilter;
  }

  return css;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Returns the Y position for the subtitle overlay */
export function getOverlayPosition(cs: CaptionStyle): React.CSSProperties {
  switch (cs.position) {
    case "top":
      return { top: `${cs.yOffset}%`, bottom: "auto" };
    case "center":
      return { top: "50%", transform: "translateY(-50%)" };
    case "bottom":
    default:
      return { bottom: `${100 - cs.yOffset}%`, top: "auto" };
  }
}

// ─── Word-by-word chunking ────────────────────────────────────────────────────

const SENTENCE_BREAK = /[.!?,;:\u0964\u0965\u061F\u060C]$/; // incl. Devanagari danda, Arabic ? and ,

/**
 * Split a subtitle segment into short word groups (max `wordsPerCaption`),
 * breaking early on punctuation, and return the group active at `time`.
 * Falls back to evenly-timed text tokens when word timestamps are missing.
 */
export function getActiveCaptionChunk(
  sub: SubtitleEntry,
  time: number,
  wordsPerCaption: number,
  script: "native" | "roman",
): { key: string; words: { text: string; active: boolean }[] } {
  const maxWords = Math.max(1, Math.round(wordsPerCaption || 3));

  let words: { text: string; start: number; end: number }[] = sub.words.map((w) => ({
    text: script === "roman" && w.roman_word ? w.roman_word : w.word,
    start: w.start,
    end: w.end,
  }));

  if (words.length === 0) {
    const raw = (script === "roman" && sub.roman_text ? sub.roman_text : sub.text)
      .split(/\s+/)
      .filter(Boolean);
    const step = (sub.end - sub.start) / Math.max(1, raw.length);
    words = raw.map((text, i) => ({
      text,
      start: sub.start + i * step,
      end: sub.start + (i + 1) * step,
    }));
  }

  words = words.map((w) => ({ ...w, text: w.text.trim() })).filter((w) => w.text);
  if (words.length === 0) return { key: `${sub.index}-empty`, words: [] };

  // Build chunks
  const chunks: (typeof words)[] = [];
  let current: typeof words = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= maxWords || SENTENCE_BREAK.test(w.text)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);

  // Active chunk = last chunk that has started (holds through gaps between words)
  let chunkIdx = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (time >= chunks[i]![0]!.start) chunkIdx = i;
    else break;
  }

  const chunk = chunks[chunkIdx]!;
  return {
    key: `${sub.index}-${chunkIdx}`,
    words: chunk.map((w) => ({ text: w.text, active: time >= w.start && time <= w.end })),
  };
}

/** Hook to read/set a single caption style property */
export function useCaptionStyle() {
  const { state, dispatch } = useEditor();
  const set = useCallback(
    (patch: Partial<CaptionStyle>) => dispatch({ type: "SET_CAPTION_STYLE", payload: patch }),
    [dispatch],
  );
  return { style: state.captionStyle, set };
}
