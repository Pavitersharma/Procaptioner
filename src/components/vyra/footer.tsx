import { Link } from "@tanstack/react-router";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";

const COLS = [
  {
    title: "Product",
    items: [
      { label: "Caption generator", to: "/editor" },
      { label: "Transcription", to: "/editor" },
      { label: "Subtitle translator", to: "/editor" },
      { label: "Video editor", to: "/editor" },
      { label: "Templates", to: "/#templates" },
    ],
  },
  {
    title: "Use cases",
    items: [
      { label: "Podcasters", to: "/pricing" },
      { label: "YouTubers", to: "/pricing" },
      { label: "Educators", to: "/pricing" },
      { label: "Agencies", to: "/pricing" },
      { label: "Brands", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/signup" },
      { label: "Pricing", to: "/pricing" },
      { label: "Changelog", to: "/pricing" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div>
            <Link
              to="/"
              className="inline-block transition-opacity hover:opacity-85"
              aria-label="ProCaptioner Home"
            >
              <ProCaptionerLogo size="lg" />
            </Link>
            <p className="mt-5 max-w-xs text-sm text-muted-foreground">
              Technology that disappears behind creativity.
            </p>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="label-mono">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((i) => (
                  <li key={i.label}>
                    {i.to.startsWith("/#") ? (
                      <a
                        href={i.to}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {i.label}
                      </a>
                    ) : (
                      <Link
                        to={i.to}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {i.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="label-mono mt-16 border-t border-border pt-6">
          © 2026 ProCaptioner — built for people who cut video.
        </p>
      </div>
    </footer>
  );
}
