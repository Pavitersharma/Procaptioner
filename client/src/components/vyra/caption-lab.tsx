import { useEffect, useState } from "react";
import { SectionTag } from "./primitives";

const STYLES = [
  "Editorial",
  "Bold",
  "Karaoke",
  "Minimal",
  "Punch",
  "Podcast",
  "Cinematic",
  "Social",
] as const;
type StyleName = (typeof STYLES)[number];

const LINE = "WE ARE BUILDING THE FUTURE";

const POSITIONS = ["Bottom", "Center", "Top"] as const;

function classesFor(style: StyleName) {
  switch (style) {
    case "Editorial":
      return "text-[clamp(1.1rem,2.6vw,2rem)] font-medium tracking-tight lowercase text-white";
    case "Bold":
      return "text-[clamp(1.3rem,3.4vw,2.8rem)] font-extrabold tracking-tighter text-white";
    case "Minimal":
      return "text-[clamp(0.9rem,1.9vw,1.3rem)] font-normal tracking-[0.14em] uppercase text-white/85";
    case "Podcast":
      return "text-[clamp(1rem,2.2vw,1.6rem)] font-semibold tracking-tight text-white";
    case "Cinematic":
      return "text-[clamp(0.95rem,2vw,1.4rem)] font-light tracking-[0.3em] uppercase text-white/90";
    case "Social":
      return "text-[clamp(1.2rem,3vw,2.4rem)] font-black tracking-tight uppercase text-white";
    default:
      return "text-[clamp(1.2rem,3vw,2.4rem)] font-bold tracking-tight uppercase text-white";
  }
}

export function CaptionLab() {
  const [style, setStyle] = useState<StyleName>("Punch");
  const [pos, setPos] = useState<(typeof POSITIONS)[number]>("Bottom");
  const [w, setW] = useState(0);
  const words = LINE.split(" ");

  useEffect(() => {
    const t = setInterval(() => setW((x) => (x + 1) % (words.length + 2)), 480);
    return () => clearInterval(t);
  }, [words.length]);

  return (
    <section id="lab" className="border-t border-border py-24 md:py-40">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <SectionTag index="04">Caption style lab</SectionTag>
        <h2 className="text-display mt-8 max-w-3xl text-[clamp(2.4rem,6vw,5.5rem)]">
          Captions are part of the <span className="text-accent">story.</span>
        </h2>

        <div className="mt-14 grid gap-px border border-border bg-border lg:grid-cols-[1fr_300px]">
          <div className="relative aspect-[16/10] bg-[radial-gradient(ellipse_at_60%_110%,var(--surface-3),#050505)] md:aspect-[16/8]">
            <div
              aria-hidden
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.035) 2px 3px)",
              }}
            />
            <div
              className={`absolute inset-x-8 flex justify-center transition-all duration-500 ${
                pos === "Bottom"
                  ? "bottom-10"
                  : pos === "Center"
                    ? "top-1/2 -translate-y-1/2"
                    : "top-10"
              }`}
            >
              <p
                key={style}
                className={`flex flex-wrap justify-center gap-x-2 gap-y-1 text-center animate-[fade-in_0.4s_ease-out] ${classesFor(style)}`}
              >
                {words.map((word, i) => {
                  const on = i <= w;
                  if (style === "Karaoke")
                    return (
                      <span key={i} className={on ? "text-accent" : "text-white/35"}>
                        {word}
                      </span>
                    );
                  if (style === "Punch" || style === "Social")
                    return (
                      <span
                        key={i}
                        className={i === w ? "bg-accent px-1.5 text-accent-foreground" : "px-1.5"}
                      >
                        {word}
                      </span>
                    );
                  return (
                    <span key={i} className={on ? "opacity-100" : "opacity-40"}>
                      {word}
                    </span>
                  );
                })}
              </p>
            </div>

            {/* scrub bar */}
            <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.6rem] text-white/60">
                  00:0{Math.min(9, w)}.
                  {String(w * 11)
                    .padStart(2, "0")
                    .slice(0, 2)}
                </span>
                <div className="relative h-1 flex-1 bg-white/15">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-300"
                    style={{ width: `${((w + 1) / (words.length + 2)) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[0.6rem] text-white/60">00:12</span>
              </div>
              <div className="mt-2 flex gap-1">
                {words.map((word, i) => (
                  <button
                    key={i}
                    onClick={() => setW(i)}
                    aria-label={`Jump to word ${word}`}
                    className={`h-6 flex-1 border font-mono text-[0.55rem] tracking-wider uppercase transition-colors ${
                      i === w
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/10 text-white/40 hover:border-white/30"
                    }`}
                  >
                    {word.slice(0, 6)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="bg-surface-0 p-5">
            <p className="label-mono">Style</p>
            <div className="mt-3 grid grid-cols-2 gap-px bg-border">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`bg-surface-0 px-3 py-3 text-left font-mono text-[0.62rem] tracking-[0.12em] uppercase transition-colors ${
                    style === s
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="label-mono mt-7">Position</p>
            <div className="mt-3 flex gap-px bg-border">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPos(p)}
                  className={`flex-1 bg-surface-0 py-2.5 font-mono text-[0.62rem] tracking-[0.12em] uppercase transition-colors ${
                    pos === p ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <p className="label-mono mt-7">Output</p>
            <ul className="mt-3 space-y-2 font-mono text-[0.65rem] text-muted-foreground">
              <li className="flex justify-between border-b border-border pb-2">
                <span>FONT</span>
                <span className="text-foreground">Geist / 600</span>
              </li>
              <li className="flex justify-between border-b border-border pb-2">
                <span>ANIM</span>
                <span className="text-foreground">
                  {style === "Karaoke" ? "Fill" : "Pop"} 180ms
                </span>
              </li>
              <li className="flex justify-between">
                <span>SAFE AREA</span>
                <span className="text-accent">PASS</span>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
