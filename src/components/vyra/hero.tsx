import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Magnetic, Btn } from "./primitives";
import heroFrame from "@/assets/hero-frame.jpg";

const CAPTIONS = [
  { text: "THIS IS YOUR STORY.", style: "punch" },
  { text: "NOW MAKE PEOPLE WATCH.", style: "editorial" },
  { text: "EVERY WORD MATTERS.", style: "karaoke" },
];

function CaptionRender({
  text,
  styleKey,
  active,
}: {
  text: string;
  styleKey: string;
  active: number;
}) {
  const words = text.split(" ");
  if (styleKey === "editorial")
    return (
      <p className="text-center text-[clamp(1rem,2.4vw,1.9rem)] font-medium tracking-tight text-white">
        {text.toLowerCase()}
      </p>
    );
  if (styleKey === "karaoke")
    return (
      <p className="flex flex-wrap justify-center gap-x-2 text-center text-[clamp(1rem,2.4vw,1.9rem)] font-bold tracking-tight">
        {words.map((w, i) => (
          <span key={i} className={i <= active ? "text-accent" : "text-white/45"}>
            {w}
          </span>
        ))}
      </p>
    );
  return (
    <p className="text-center text-[clamp(1.1rem,2.8vw,2.2rem)] leading-[1.05] font-extrabold tracking-tighter text-white">
      {words.map((w, i) => (
        <span key={i} className={i === active ? "bg-accent px-1 text-accent-foreground" : "px-1"}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

export function Hero() {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [word, setWord] = useState(0);
  const [progress, setProgress] = useState(0);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setWord((w) => {
        const total = (CAPTIONS[idx]?.text ?? "").split(" ").length;
        if (w + 1 >= total) {
          setIdx((i) => (i + 1) % CAPTIONS.length);
          return 0;
        }
        return w + 1;
      });
    }, 620);
    return () => clearInterval(t);
  }, [idx]);

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => (p + 0.35) % 100), 60);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      const el = frame.current;
      if (!el) return;
      const rx = (e.clientY / window.innerHeight - 0.5) * -5;
      const ry = (e.clientX / window.innerWidth - 0.5) * 7;
      el.style.transform = `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black, transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="label-mono mb-8 flex flex-wrap items-center gap-3">
          <span className="inline-flex h-1.5 w-1.5 animate-[vyra-pulse_2s_ease-in-out_infinite] rounded-full bg-accent" />
          <span>AI captioning engine — v3.1 live</span>
        </div>

        <h1 className="text-display text-[clamp(3.4rem,11vw,10rem)]">
          <span className="block overflow-hidden">
            <span className="block animate-[fade-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both]">
              Your voice.
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              className="block animate-[fade-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both] text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Perfectly <em className="text-accent not-italic">captioned.</em>
            </span>
          </span>
        </h1>

        <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            Turn speech into beautifully designed captions, subtitles and finished video — in
            seconds, in any language, without leaving the timeline.
          </p>
          <div className="flex flex-wrap gap-3">
            <Magnetic>
              {user ? (
                <Link to="/editor">
                  <Btn>
                    Start creating <span className="text-accent-foreground/70">→</span>
                  </Btn>
                </Link>
              ) : (
                <a href="/signin?redirect=/editor">
                  <Btn>
                    Start creating <span className="text-accent-foreground/70">→</span>
                  </Btn>
                </a>
              )}
            </Magnetic>
            <Magnetic>
              <Btn
                variant="line"
                data-cursor="PLAY"
                onClick={() => {
                  document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Play className="h-3.5 w-3.5" /> Watch the product
              </Btn>
            </Magnetic>
          </div>
        </div>

        {/* Floating editor */}
        <div className="mt-16 md:mt-24" style={{ perspective: 1400 }}>
          <div
            ref={frame}
            className="overflow-hidden border border-border bg-surface-1 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] transition-transform duration-500 ease-out will-change-transform"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex gap-1.5">
                  {["bg-surface-3", "bg-surface-3", "bg-surface-3"].map((c, i) => (
                    <span key={i} className={`h-2 w-2 rounded-full ${c}`} />
                  ))}
                </span>
                <span className="truncate font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                  ep_047_final.mp4 — 00:04:12
                </span>
              </div>
              <span className="hidden items-center gap-2 font-mono text-[0.6rem] tracking-[0.16em] text-accent uppercase sm:flex">
                <Sparkles className="h-3 w-3" /> AI transcribing
              </span>
            </div>

            <div className="grid md:grid-cols-[1fr_240px]">
              <div className="relative aspect-[16/9] bg-[radial-gradient(ellipse_at_50%_120%,var(--surface-3),var(--surface-0))]">
                <img
                  src={heroFrame}
                  alt="Filmmaker speaking to camera inside the ProCaptioner editor preview"
                  width={1600}
                  height={912}
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(to_top,var(--surface-0)_2%,transparent_55%)]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent 0 3px, rgba(255,255,255,0.03) 3px 4px)",
                  }}
                />
                <div className="absolute inset-x-6 bottom-10 md:bottom-16">
                  <CaptionRender
                    text={CAPTIONS[idx]?.text ?? ""}
                    styleKey={CAPTIONS[idx]?.style ?? "punch"}
                    active={word}
                  />
                </div>
                <div className="absolute top-4 left-4 font-mono text-[0.6rem] tracking-[0.2em] text-white/50">
                  ● REC 4K · 24FPS
                </div>
              </div>

              <aside className="hidden border-l border-border p-4 md:block">
                <p className="label-mono mb-4">Caption style</p>
                {["Punch", "Editorial", "Karaoke", "Minimal"].map((s, i) => (
                  <div
                    key={s}
                    className={`mb-1.5 flex items-center justify-between border px-3 py-2 font-mono text-[0.65rem] tracking-wider uppercase ${
                      i === idx % 4
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {s}
                    {i === idx % 4 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </div>
                ))}
                <p className="label-mono mt-6 mb-2">Confidence</p>
                <p className="font-mono text-2xl text-foreground">96.4%</p>
              </aside>
            </div>

            {/* timeline */}
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground">
                <span>TIMELINE</span>
                <span>{`00:0${Math.floor(progress / 25)}:${String(Math.floor(progress) % 60).padStart(2, "0")}`}</span>
              </div>
              <div className="relative h-14 overflow-hidden border border-border bg-surface-0">
                <div className="flex h-7 border-b border-border">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-full flex-1 border-r border-border/60"
                      style={{ backgroundColor: `oklch(${0.2 + (i % 5) * 0.015} 0.004 60)` }}
                    />
                  ))}
                </div>
                <div className="flex h-7 items-center gap-1 px-1">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-full bg-accent/45"
                      style={{ height: `${(8 + Math.abs(Math.sin(i * 1.7)) * 16).toFixed(2)}px` }}
                    />
                  ))}
                </div>
                <div
                  className="absolute top-0 bottom-0 w-px bg-accent"
                  style={{ left: `${progress}%` }}
                  aria-hidden
                >
                  <span className="absolute -top-0.5 -left-[3px] h-1.5 w-1.5 rotate-45 bg-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
