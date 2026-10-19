import { SectionTag } from "./primitives";

const QUOTES = [
  {
    q: "I stopped spending hours fixing captions.",
    who: "Rhea Iyer",
    role: "YouTube · 1.2M subs",
    hi: "hours",
  },
  {
    q: "Our Hindi and Tamil cuts now ship the same day as English.",
    who: "Studio Neap",
    role: "Agency, Bengaluru",
    hi: "same day",
  },
  {
    q: "The timeline actually behaves like an NLE. That never happens.",
    who: "Marcus Vale",
    role: "Editor, documentary",
    hi: "behaves like an NLE",
  },
];

const INTEGRATIONS = [
  "Premiere Pro",
  "DaVinci Resolve",
  "Final Cut",
  "YouTube",
  "Instagram",
  "TikTok",
  "Google Drive",
  "Dropbox",
];

export function Proof() {
  return (
    <>
      <section className="border-t border-border py-24 md:py-36">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <SectionTag index="09">From the field</SectionTag>
          <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3">
            {QUOTES.map((t) => {
              const [before, after] = t.q.split(t.hi);
              return (
                <figure key={t.who} className="bg-surface-0 p-7">
                  <span aria-hidden className="block font-mono text-4xl leading-none text-accent">
                    “
                  </span>
                  <blockquote className="mt-5 text-xl leading-snug font-medium tracking-tight">
                    {before}
                    <span className="text-accent">{t.hi}</span>
                    {after}
                  </blockquote>
                  <figcaption className="label-mono mt-8">
                    {t.who} — {t.role}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-t border-border py-14">
        <div className="flex w-max animate-[vyra-marquee_38s_linear_infinite] gap-3">
          {[...INTEGRATIONS, ...INTEGRATIONS].map((n, i) => (
            <span
              key={i}
              className="border border-border px-6 py-3 font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-accent hover:text-accent"
            >
              {n}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
