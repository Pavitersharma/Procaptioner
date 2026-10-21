import { useEffect, useRef, useState } from "react";
import { SectionTag, useInView } from "./primitives";

const STEPS = [
  { word: "Speak.", note: "Record or upload. Any device, any codec, up to 5GB." },
  { word: "Transcribe.", note: "Word-level timestamps at 98.2% median accuracy." },
  { word: "Style.", note: "Type, motion and rhythm — designed, not defaulted." },
  { word: "Translate.", note: "38 languages with tone-aware rewriting." },
  { word: "Export.", note: "Burned-in, SRT, VTT, or straight to your NLE." },
];

export function Philosophy() {
  const { ref, visible } = useInView<HTMLDivElement>(0.3);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = listRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = 1 - (r.top + r.height * 0.2) / window.innerHeight;
      setActive(Math.max(0, Math.min(STEPS.length - 1, Math.floor(p * STEPS.length))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headline = "Editing shouldn't feel like editing.".split(" ");

  return (
    <section className="border-t border-border py-24 md:py-40">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <SectionTag index="01">Philosophy</SectionTag>
        <div ref={ref} className="mt-10 max-w-5xl">
          <h2 className="text-display text-[clamp(2.4rem,7vw,6rem)]">
            {headline.map((w, i) => (
              <span
                key={i}
                className="inline-block transition-colors duration-500"
                style={{
                  transitionDelay: `${i * 90}ms`,
                  color: visible && (i === 0 || i === 3) ? "var(--accent)" : undefined,
                }}
              >
                {w}&nbsp;
              </span>
            ))}
          </h2>
        </div>

        <ol
          ref={listRef}
          className="mt-20 grid gap-px border border-border bg-border md:grid-cols-5"
        >
          {STEPS.map((s, i) => (
            <li
              key={s.word}
              className={`relative flex min-h-56 flex-col justify-between bg-surface-0 p-6 transition-colors duration-500 ${
                i === active ? "bg-surface-1" : ""
              }`}
            >
              <span className="label-mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p
                  className={`text-3xl font-semibold tracking-tight transition-colors duration-500 ${
                    i === active ? "text-accent" : "text-foreground"
                  }`}
                >
                  {s.word}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.note}</p>
              </div>
              <span
                className="absolute inset-x-0 bottom-0 h-px bg-accent transition-transform duration-700 origin-left"
                style={{ transform: `scaleX(${i <= active ? 1 : 0})` }}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
