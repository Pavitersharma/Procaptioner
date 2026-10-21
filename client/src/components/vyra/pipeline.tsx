import { SectionTag, useInView } from "./primitives";

const STAGES = [
  ["Upload", "5GB · MP4 / MOV / WebM"],
  ["Audio extraction", "Stem isolation"],
  ["Speech recognition", "Word-level"],
  ["Language detection", "38 locales"],
  ["Timestamps", "±40ms drift"],
  ["Caption design", "Style engine"],
  ["Export", "SRT · VTT · Burn-in"],
];

export function Pipeline() {
  const { ref, visible } = useInView<HTMLDivElement>(0.2);
  return (
    <section className="border-t border-border py-24 md:py-36">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTag index="03">Pipeline</SectionTag>
          <p className="max-w-sm text-sm text-muted-foreground">
            Seven stages, one pass. Average turnaround for a 20-minute episode: 41 seconds.
          </p>
        </div>

        <div ref={ref} className="mt-14 overflow-x-auto pb-4">
          <div className="flex min-w-[900px] items-stretch">
            {STAGES.map(([title, sub], i) => (
              <div key={title} className="relative flex-1">
                <div
                  className="absolute top-6 right-0 left-0 h-px bg-accent/70 origin-left transition-transform duration-700"
                  style={{
                    transform: `scaleX(${visible ? 1 : 0})`,
                    transitionDelay: `${i * 140}ms`,
                  }}
                />
                <div
                  className="reveal px-4"
                  data-visible={visible}
                  style={{ transitionDelay: `${i * 140}ms` }}
                >
                  <span
                    className="relative z-10 block h-3 w-3 rotate-45 border border-accent bg-background"
                    style={{ marginTop: "1.15rem" }}
                  />
                  <p className="mt-8 font-mono text-[0.65rem] tracking-[0.16em] uppercase">
                    {title}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
