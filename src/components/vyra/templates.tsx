import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { SectionTag } from "./primitives";
import { Crown } from "lucide-react";

const TEMPLATES = [
  {
    name: "Editorial Bold",
    cat: "Premium · Editorial",
    by: "ProCaptioner Studio",
    hue: 45,
    isPro: true,
    headline: "THE FUTURE IS HERE",
    accent: "FUTURE",
  },
  {
    name: "Golden Frame",
    cat: "Premium · Luxury",
    by: "ProCaptioner Studio",
    hue: 40,
    isPro: true,
    headline: "BIG CHANGES",
    accent: "CHANGES",
  },
  {
    name: "Kinetic Focus",
    cat: "Premium · High-Energy",
    by: "ProCaptioner Studio",
    hue: 140,
    isPro: true,
    headline: "THIS IS IMPORTANT",
    accent: "IMPORTANT",
  },
  {
    name: "Luxury Magazine",
    cat: "Premium · Fashion",
    by: "ProCaptioner Studio",
    hue: 300,
    isPro: true,
    headline: "BETTER LIFE",
    accent: "BETTER",
  },
  {
    name: "Creator Podcast",
    cat: "Premium · Podcast",
    by: "ProCaptioner Studio",
    hue: 270,
    isPro: true,
    headline: "BUILD BETTER",
    accent: "BUILD",
  },
  {
    name: "Cinematic Quote",
    cat: "Premium · Cinema",
    by: "ProCaptioner Studio",
    hue: 35,
    isPro: true,
    headline: "SUCCESS IS A JOURNEY",
    accent: "JOURNEY",
  },
  {
    name: "Late Night Cut",
    cat: "Podcast",
    by: "Studio Neap",
    hue: 30,
    isPro: false,
    headline: "EVERY WORD LANDS",
    accent: "EVERY",
  },
];

export function Templates() {
  const { user } = useAuth();
  return (
    <section id="templates" className="border-t border-border py-24 md:py-36">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTag index="07">Templates</SectionTag>
          <p className="max-w-sm text-sm text-muted-foreground">
            10 new studio-grade Premium Caption Systems + Classic Presets. Drop one on a timeline,
            keep your brand kit.
          </p>
        </div>
      </div>

      <div className="mt-12 flex gap-4 overflow-x-auto px-5 pb-6 md:px-10">
        {TEMPLATES.map((t) => {
          const cardContent = (
            <>
              <div
                className="relative aspect-[4/5] transition-transform duration-700 group-hover:scale-[1.03]"
                style={{
                  background: `radial-gradient(ellipse at 50% 100%, oklch(0.32 0.06 ${t.hue}), #070707)`,
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.05) 2px 3px)",
                  }}
                />
                <p className="absolute inset-x-5 bottom-16 text-center text-xl font-bold tracking-tight text-white">
                  <span className="bg-accent px-1 text-accent-foreground">{t.accent}</span>{" "}
                  {t.headline.replace(t.accent, "").trim()}
                </p>
                <div className="absolute top-4 left-4 flex items-center gap-1.5 font-mono text-[0.6rem] tracking-[0.18em] text-white/70 uppercase">
                  {t.isPro && <Crown className="h-3 w-3 text-amber-400 inline" />}
                  <span>{t.cat}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border bg-surface-1 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium flex items-center gap-1.5">
                    {t.name}
                    {t.isPro && (
                      <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[0.5rem] font-bold text-amber-300">
                        PRO
                      </span>
                    )}
                  </p>
                  <p className="label-mono mt-0.5">{t.by}</p>
                </div>
                <span className="shrink-0 font-mono text-[0.6rem] tracking-[0.14em] text-accent uppercase opacity-0 transition-opacity group-hover:opacity-100">
                  Use →
                </span>
              </div>
            </>
          );

          if (!user) {
            return (
              <a
                key={t.name}
                href="/signin?redirect=/editor"
                data-cursor="PLAY"
                className="group relative w-[74vw] shrink-0 overflow-hidden border border-border sm:w-[38vw] lg:w-[26vw] block"
              >
                {cardContent}
              </a>
            );
          }

          return (
            <Link
              key={t.name}
              to="/editor"
              data-cursor="PLAY"
              className="group relative w-[74vw] shrink-0 overflow-hidden border border-border sm:w-[38vw] lg:w-[26vw] block"
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
