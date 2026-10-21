import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/vyra/nav";
import { Pricing } from "@/components/vyra/pricing";
import { Footer } from "@/components/vyra/footer";
import { Cursor } from "@/components/vyra/cursor";
import { SectionTag } from "@/components/vyra/primitives";

const title = "Pricing — ProCaptioner Creator Pro Plan";
const description =
  "One simple plan: Creator Pro at ₹199/month. Explore every font and template before subscribing. Pay when you're ready to export watermark-free videos.";

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
    "Can I preview all fonts and templates for free?",
    "Yes! You can explore and preview all 30+ styles, custom colors, animations, and edit your footage inside the studio before subscribing.",
  ],
  [
    "What video length is supported in Creator Pro?",
    "Creator Pro supports videos up to 3 minutes (180 seconds) per clip with 5 GB project storage allowance.",
  ],
  [
    "How does video export work?",
    "Once subscribed to Creator Pro for ₹199/month, you unlock high-quality video exports without watermarks, along with SRT and VTT subtitle downloads.",
  ],
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
            <h1 className="text-display mt-8 max-w-4xl text-[clamp(2.8rem,7vw,6.5rem)] font-extrabold tracking-tight text-white leading-tight">
              One simple plan.
              <br />
              <span className="text-muted-foreground">Subscribe when ready to export.</span>
            </h1>
          </div>
        </section>
        <Pricing heading={false} />
        <section className="border-t border-border py-20">
          <div className="mx-auto grid max-w-[1280px] gap-px border border-border bg-border px-0 md:grid-cols-3">
            {FAQ.map(([q, a]) => (
              <div key={q} className="bg-surface-0 p-7">
                <p className="text-lg font-medium tracking-tight text-white">{q}</p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
