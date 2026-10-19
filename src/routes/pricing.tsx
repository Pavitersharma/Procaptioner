import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/vyra/nav";
import { Pricing } from "@/components/vyra/pricing";
import { Footer } from "@/components/vyra/footer";
import { Cursor } from "@/components/vyra/cursor";
import { SectionTag } from "@/components/vyra/primitives";

const title = "Pricing — ProCaptioner AI captions and subtitles";
const description =
  "Free, Creator, Pro and Studio plans for AI transcription, captions, translation and video export. Pay less per minute as you create more.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const FAQ = [
  [
    "What counts as a minute?",
    "Source video duration, counted once. Re-renders and style changes are free.",
  ],
  [
    "Can I export SRT and VTT?",
    "On every paid plan, including burned-in captions and per-word JSON.",
  ],
  ["Do unused minutes roll over?", "Yearly plans roll over up to one month of unused minutes."],
];

function PricingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Cursor />
      <Nav />
      <main>
        <section className="px-5 pt-36 pb-4 md:px-10 md:pt-48">
          <div className="mx-auto max-w-[1280px]">
            <SectionTag index="—">Pricing</SectionTag>
            <h1 className="text-display mt-8 max-w-4xl text-[clamp(2.8rem,8vw,7rem)]">
              Create more.
              <br />
              <span className="text-muted-foreground">Pay less per minute.</span>
            </h1>
          </div>
        </section>
        <Pricing heading={false} />
        <section className="border-t border-border py-20">
          <div className="mx-auto grid max-w-[1280px] gap-px border border-border bg-border px-0 md:grid-cols-3">
            {FAQ.map(([q, a]) => (
              <div key={q} className="bg-surface-0 p-7">
                <p className="text-lg font-medium tracking-tight">{q}</p>
                <p className="mt-3 text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
