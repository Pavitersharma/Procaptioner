import { useState } from "react";
import { Sparkles, Scissors, Type, Music, LayoutGrid, Film, Palette } from "lucide-react";
import { SectionTag } from "./primitives";

const NAV = [
  { label: "Media", icon: Film },
  { label: "Captions", icon: Type },
  { label: "Text", icon: Scissors },
  { label: "Audio", icon: Music },
  { label: "Templates", icon: LayoutGrid },
  { label: "Brand", icon: Palette },
];

const AI_PROMPTS = [
  "Make these captions more engaging.",
  "Remove filler words.",
  "Translate to Hindi.",
  "Find the best moments.",
];

export function EditorShowcase() {
  const [tab, setTab] = useState("Captions");
  const [ai, setAi] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(34);

  return (
    <section id="editor" className="border-t border-border py-24 md:py-36">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTag index="06">The editor</SectionTag>
          <p className="max-w-sm text-sm text-muted-foreground">
            A dense, keyboard-first timeline built for people who cut video all day. J K L, ripple
            delete, and caption blocks that behave like clips.
          </p>
        </div>

        <div className="mt-12 overflow-hidden border border-border bg-surface-1">
          {/* toolbar */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
              {["File", "Edit", "Clip", "Captions", "View"].map((m) => (
                <span
                  key={m}
                  className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase"
                >
                  {m}
                </span>
              ))}
            </div>
            <button
              onClick={() => setAi((v) => !v)}
              className="inline-flex shrink-0 items-center gap-2 border border-accent/50 px-3 py-1.5 font-mono text-[0.62rem] tracking-[0.14em] text-accent uppercase transition-colors hover:bg-accent/10"
            >
              <Sparkles className="h-3 w-3" /> Ask AI
            </button>
          </div>

          <div className="grid lg:grid-cols-[64px_1fr_auto]">
            {/* left rail */}
            <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 lg:flex-col lg:border-r lg:border-b-0">
              {NAV.map((n) => (
                <button
                  key={n.label}
                  onClick={() => setTab(n.label)}
                  aria-label={n.label}
                  className={`grid h-12 w-12 shrink-0 place-items-center transition-colors ${
                    tab === n.label
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                </button>
              ))}
            </nav>

            {/* preview */}
            <div className="relative aspect-[16/9] bg-[radial-gradient(ellipse_at_50%_120%,var(--surface-3),#050505)]">
              <div className="absolute inset-x-8 bottom-12 text-center">
                <p className="text-[clamp(1.1rem,2.6vw,2rem)] font-bold tracking-tight text-white">
                  <span className="bg-accent px-1.5 text-accent-foreground">KEEP</span> THEM
                  WATCHING
                </p>
              </div>
              <div className="absolute top-3 left-3 font-mono text-[0.6rem] tracking-[0.2em] text-white/50">
                PROGRAM · 1920×1080
              </div>
            </div>

            {/* properties */}
            <aside className="w-full border-t border-border p-4 lg:w-64 lg:border-t-0 lg:border-l">
              <p className="label-mono">{tab} properties</p>
              <div className="mt-4 space-y-4 font-mono text-[0.65rem]">
                {[
                  ["Size", "72 px"],
                  ["Tracking", "-0.03 em"],
                  ["Offset Y", "148 px"],
                  ["Highlight", "Accent"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span>{v}</span>
                    </div>
                    <div className="mt-2 h-px bg-border">
                      <div className="h-px w-2/3 bg-accent/70" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border border-border p-3">
                <p className="label-mono">Shortcuts</p>
                <p className="mt-2 font-mono text-[0.6rem] text-muted-foreground">
                  ⌘K palette · J K L scrub · ⇧C caption · ⌥⌫ ripple
                </p>
              </div>
            </aside>
          </div>

          {/* timeline */}
          <div
            className="relative border-t border-border p-3"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHoverX(((e.clientX - r.left) / r.width) * 100);
            }}
            onMouseLeave={() => setHoverX(null)}
            onClick={() => hoverX !== null && setPlayhead(hoverX)}
          >
            <div className="mb-2 flex items-center justify-between font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground">
              <span>TIMELINE · 00:04:12</span>
              <span>
                {hoverX !== null
                  ? `00:0${Math.floor(hoverX / 25)}:${String(Math.floor(hoverX) % 60).padStart(2, "0")}`
                  : "—"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex h-10 gap-1">
                {[18, 26, 14, 22, 20].map((w, i) => (
                  <div
                    key={i}
                    className="h-full border border-border bg-surface-2"
                    style={{
                      width: `${w}%`,
                      backgroundImage:
                        "repeating-linear-gradient(90deg, var(--surface-3) 0 6px, var(--surface-2) 6px 12px)",
                    }}
                  />
                ))}
              </div>
              <div className="flex h-7 gap-1">
                {["Hello and welcome", "to the show", "let's get into it", "today"].map((c, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-1 items-center overflow-hidden border border-accent/40 bg-accent/10 px-2 font-mono text-[0.58rem] whitespace-nowrap text-accent"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex h-8 items-center gap-[2px] border border-border bg-surface-0 px-1">
                {Array.from({ length: 90 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-full bg-muted-foreground/35"
                    style={{ height: `${(4 + Math.abs(Math.sin(i * 0.9)) * 20).toFixed(2)}px` }}
                  />
                ))}
              </div>
            </div>

            {hoverX !== null && (
              <div
                className="pointer-events-none absolute top-8 bottom-3 w-px bg-foreground/30"
                style={{ left: `${hoverX}%` }}
              />
            )}
            <div
              className="pointer-events-none absolute top-8 bottom-3 w-px bg-accent"
              style={{ left: `${playhead}%` }}
            >
              <span className="absolute -top-1 -left-[3px] h-2 w-2 rotate-45 bg-accent" />
            </div>
          </div>
        </div>

        {/* AI panel */}
        {ai && (
          <div className="mt-4 animate-[slide-in-right_0.35s_cubic-bezier(0.16,1,0.3,1)] border border-border bg-surface-1 p-5 lg:ml-auto lg:max-w-md">
            <div className="flex items-center justify-between">
              <p className="label-mono">ProCaptioner copilot</p>
              <button onClick={() => setAi(false)} className="label-mono hover:text-foreground">
                Close
              </button>
            </div>
            <div className="mt-4 border-l-2 border-accent pl-4 text-sm leading-relaxed">
              Tightened 14 captions, removed 26 filler words and split two lines that broke the safe
              area. Want me to punch up the hook at 00:04?
              <span className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 animate-[vyra-pulse_1s_infinite] bg-accent" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {AI_PROMPTS.map((p) => (
                <button
                  key={p}
                  className="border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
