import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Nav } from "@/components/vyra/nav";
import { Hero } from "@/components/vyra/hero";
import { Philosophy } from "@/components/vyra/philosophy";
import { Transcription } from "@/components/vyra/transcription";
import { Pipeline } from "@/components/vyra/pipeline";
import { CaptionLab } from "@/components/vyra/caption-lab";
import { Languages } from "@/components/vyra/languages";
import { EditorShowcase } from "@/components/vyra/editor-showcase";
import { Templates } from "@/components/vyra/templates";
import { Pricing } from "@/components/vyra/pricing";
import { Proof } from "@/components/vyra/proof";
import { UploadCta } from "@/components/vyra/upload-cta";
import { Footer } from "@/components/vyra/footer";
import { Cursor } from "@/components/vyra/cursor";

const title = "ProCaptioner — AI captions, subtitles and video editing";
const description =
  "Turn speech into beautifully designed captions, subtitles and finished video in seconds. Word-level timestamps, 38 languages, a real timeline.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

function Index() {
  // Smooth scroll to hash when landing on page or hash changes
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // Small delay to ensure all child components have rendered
    const timer = setTimeout(handleHashScroll, 120);
    window.addEventListener("hashchange", handleHashScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", handleHashScroll);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <Cursor />
      <Nav />
      <main>
        <Hero />
        <Philosophy />
        <Transcription />
        <Pipeline />
        <CaptionLab />
        <Languages />
        <EditorShowcase />
        <Templates />
        <Proof />
        <Pricing />
        <UploadCta />
      </main>
      <Footer />
    </div>
  );
}
