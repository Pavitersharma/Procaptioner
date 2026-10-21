import { useEffect, useRef, useState } from "react";
import { SectionTag } from "./primitives";

const LINES = [
  { t: "00:04.21", text: "Today we're building something that shouldn't exist yet." },
  { t: "00:08.06", text: "Most editors spend four hours a week fixing captions." },
  { t: "00:12.44", text: "We wanted that number to be zero." },
  { t: "00:15.90", text: "So we rebuilt transcription around the timeline itself." },
];

export function Transcription() {
  const [active, setActive] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % LINES.length), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      const v = Math.min(1, Math.abs(window.scrollY - last.current) / 90);
      last.current = window.scrollY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVelocity(v));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="transcription" className="border-t border-border py-24 md:py-40">
      <div className="mx-auto grid max-w-[1280px] gap-16 px-5 md:grid-cols-2 md:items-center md:px-10">
        <div>
          <SectionTag index="02">Transcription</SectionTag>
          <h2 className="text-display mt-8 text-[clamp(2.6rem,6vw,5.5rem)]">
            From voice
            <br />
            <span className="text-muted-foreground">to timeline.</span>
          </h2>
          <p className="mt-8 max-w-sm text-muted-foreground">
            Every syllable is anchored to a frame. Edit the text and the timeline follows — cut a
            sentence, cut the video.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-px border border-border bg-border">
            {[
              ["98.2%", "accuracy"],
              ["38", "languages"],
              ["12s", "per hour"],
            ].map(([v, k]) => (
              <div key={k} className="bg-surface-0 p-4">
                <dt className="font-mono text-2xl text-accent">{v}</dt>
                <dd className="label-mono mt-1">{k}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border border-border bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="label-mono">Waveform · 48kHz</span>
            <span className="font-mono text-[0.6rem] tracking-[0.16em] text-accent uppercase">
              Listening
            </span>
          </div>
          <div className="flex h-28 items-center gap-[3px] overflow-hidden px-4">
            {Array.from({ length: 72 }).map((_, i) => {
              const base = Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21));
              const h = (6 + base * (28 + velocity * 60)).toFixed(2);
              return (
                <span
                  key={i}
                  className="w-full transition-[height] duration-200 ease-out"
                  style={{
                    height: `${h}px`,
                    backgroundColor:
                      i / 72 < (active + 1) / LINES.length ? "var(--accent)" : "var(--surface-3)",
                  }}
                />
              );
            })}
          </div>
          <ul className="border-t border-border">
            {LINES.map((l, i) => (
              <li
                key={l.t}
                className={`flex gap-5 border-b border-border px-4 py-4 transition-colors duration-300 ${
                  i === active ? "bg-surface-2" : ""
                }`}
              >
                <span
                  className={`shrink-0 font-mono text-[0.7rem] ${i === active ? "text-accent" : "text-muted-foreground"}`}
                >
                  {l.t}
                </span>
                <p className="text-sm leading-relaxed">
                  {l.text.split(" ").map((w, wi) => (
                    <span
                      key={wi}
                      className={
                        i === active && wi < 6
                          ? "text-foreground"
                          : i === active
                            ? "text-foreground/70"
                            : "text-muted-foreground"
                      }
                    >
                      {w}{" "}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
