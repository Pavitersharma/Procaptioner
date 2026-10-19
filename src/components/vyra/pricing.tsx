import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SectionTag, Btn } from "./primitives";

const PLANS = [
  {
    name: "Free",
    price: [0, 0],
    mins: 30,
    cap: 60,
    blurb: "Try the engine.",
    perks: ["720p export", "Watermark", "3 templates"],
  },
  {
    name: "Creator",
    price: [19, 15],
    mins: 600,
    cap: 1000,
    blurb: "For weekly publishers.",
    perks: ["1080p export", "No watermark", "All caption styles", "SRT / VTT"],
  },
  {
    name: "Pro",
    price: [49, 39],
    mins: 2840,
    cap: 5000,
    blurb: "For full-time editors.",
    perks: ["4K export", "38 languages", "Brand kits", "AI copilot"],
  },
  {
    name: "Studio",
    price: [129, 99],
    mins: 12000,
    cap: 20000,
    blurb: "For teams and agencies.",
    perks: ["Seats & roles", "Shared brand kits", "API access", "Priority render"],
  },
];

export function Pricing({ heading = true }: { heading?: boolean }) {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="border-t border-border py-24 md:py-36">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        {heading && (
          <>
            <SectionTag index="08">Pricing</SectionTag>
            <h2 className="text-display mt-8 max-w-3xl text-[clamp(2.4rem,6vw,5.5rem)]">
              Create more.
              <br />
              <span className="text-muted-foreground">Pay less per minute.</span>
            </h2>
          </>
        )}

        <div className="mt-10 inline-flex border border-border">
          {(["Monthly", "Yearly"] as const).map((m, i) => (
            <button
              key={m}
              onClick={() => setYearly(i === 1)}
              className={`px-5 py-2.5 font-mono text-[0.65rem] tracking-[0.16em] uppercase transition-colors ${
                yearly === (i === 1) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {m}
              {i === 1 && <span className="ml-2 opacity-70">−20%</span>}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-px border border-border bg-border lg:grid-cols-4">
          {PLANS.map((p) => {
            const featured = p.name === "Creator";
            return (
              <div
                key={p.name}
                className={`relative flex flex-col bg-surface-0 p-6 ${featured ? "bg-surface-1" : ""}`}
              >
                {featured && (
                  <span className="absolute top-0 right-0 bg-accent px-2 py-1 font-mono text-[0.55rem] tracking-[0.16em] text-accent-foreground uppercase">
                    Recommended
                  </span>
                )}
                <p className="label-mono">{p.name}</p>
                <p className="mt-6 font-mono text-4xl tracking-tight">
                  ${yearly ? p.price[1] : p.price[0]}
                  <span className="ml-1 text-xs text-muted-foreground">/mo</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>

                <div className="mt-7">
                  <p className="label-mono mb-2">Minutes / mo</p>
                  <div className="flex h-2 gap-px">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <span
                        key={i}
                        className={`flex-1 ${i / 14 < p.mins / p.cap ? "bg-accent" : "bg-surface-3"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground">
                    {p.mins.toLocaleString()} / {p.cap.toLocaleString()}
                  </p>
                </div>

                <ul className="mt-7 flex-1 space-y-2.5 text-sm text-muted-foreground">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2 border-b border-border pb-2.5">
                      <span className="text-accent">/</span>
                      {perk}
                    </li>
                  ))}
                </ul>

                <Link to={p.name === "Free" ? "/editor" : "/signup"} className="mt-7 w-full block">
                  <Btn variant={featured ? "solid" : "line"} className="w-full">
                    {p.name === "Free" ? "Start free" : `Choose ${p.name}`}
                  </Btn>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
