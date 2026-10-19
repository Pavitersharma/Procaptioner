import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SectionTag, Btn } from "./primitives";

export function UploadCta() {
  const [over, setOver] = useState(false);
  const [state, setState] = useState<"idle" | "processing">("idle");

  return (
    <section className="border-t border-border py-24 md:py-36">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <SectionTag index="10">Start</SectionTag>
        <div className="mt-12 grid gap-px border border-border bg-border lg:grid-cols-[1.2fr_1fr]">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              window.location.href = "/editor";
            }}
            className="relative grid min-h-[22rem] place-items-center bg-surface-0 p-8 transition-colors duration-300"
            style={{
              background: over
                ? "color-mix(in oklab, var(--accent) 8%, var(--surface-0))"
                : undefined,
            }}
          >
            <div
              className="absolute inset-4 border border-dashed transition-all duration-300"
              style={{
                borderColor: over ? "var(--accent)" : "var(--border)",
                inset: over ? "0.5rem" : "1rem",
              }}
            />
            <div className="relative text-center">
              <p className="text-display text-[clamp(1.8rem,4vw,3.2rem)]">
                {over ? "Release to upload." : "Drop your story here."}
              </p>
              <p className="label-mono mt-4">MP4, MOV, WebM up to 5GB</p>
              <Link to="/editor" className="mt-8 inline-block">
                <Btn>
                  Choose a file <span className="text-accent-foreground/70">→</span>
                </Btn>
              </Link>
            </div>
          </div>

          <div className="bg-surface-1 p-8">
            <p className="label-mono">
              {state === "processing" ? "Analyzing audio" : "What happens next"}
            </p>
            <div className="mt-6 space-y-5">
              {[
                ["Audio extracted", 100],
                ["Speech recognised", state === "processing" ? 82 : 40],
                ["Captions designed", state === "processing" ? 46 : 0],
              ].map(([label, pct]) => (
                <div key={label as string}>
                  <div className="flex justify-between font-mono text-[0.65rem] text-muted-foreground">
                    <span>{label}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-2 flex h-2 gap-px">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <span
                        key={i}
                        className={`flex-1 transition-colors duration-500 ${
                          (i / 24) * 100 < (pct as number) ? "bg-accent" : "bg-surface-3"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 font-mono text-[0.65rem]">
              {[
                ["Language", "Hindi"],
                ["Words", "2,431"],
                ["Confidence", "96.4%"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground uppercase tracking-[0.14em]">{k}</dt>
                  <dd className="mt-1 text-base text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
