import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Menu, X, SunMedium, Moon } from "lucide-react";
import { ProCaptionerLogo } from "@/components/brand/pro-captioner-logo";
import { Btn } from "./primitives";

interface NavItem {
  label: string;
  to: string;
  isHash?: boolean;
  hashId?: string;
}

const navLinks: NavItem[] = [
  { label: "Editor", to: "/editor" },
  { label: "Product", to: "/#editor", isHash: true, hashId: "editor" },
  { label: "Captions", to: "/#lab", isHash: true, hashId: "lab" },
  { label: "Languages", to: "/#languages", isHash: true, hashId: "languages" },
  { label: "Pricing", to: "/pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleHashClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, hashId?: string) => {
      if (!hashId) return;

      if (currentPath === "/" || currentPath === "") {
        e.preventDefault();
        const target = document.getElementById(hashId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", `/#${hashId}`);
        }
      }
      setOpen(false);
    },
    [currentPath],
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-xl shadow-lg shadow-black/20"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1280px] items-center justify-between px-5 transition-all duration-300 md:px-10 ${
          scrolled ? "h-14" : "h-20"
        }`}
      >
        <Link
          to="/"
          className="inline-flex items-center text-foreground transition-opacity hover:opacity-85"
          aria-label="ProCaptioner home"
        >
          <ProCaptionerLogo size="md" />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-8 lg:gap-10 md:flex" aria-label="Primary">
          {navLinks.map((l) => {
            if (l.isHash) {
              return (
                <a
                  key={l.label}
                  href={l.to}
                  onClick={(e) => handleHashClick(e, l.hashId)}
                  className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              );
            }

            return (
              <Link
                key={l.label}
                to={l.to}
                className={`font-mono text-[0.7rem] tracking-[0.16em] uppercase transition-colors hover:text-foreground ${
                  currentPath === l.to ? "text-brand-orange font-semibold" : "text-muted-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLight((v) => !v)}
            aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]"
          >
            {light ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
          </button>

          <Link
            to="/login"
            className="hidden font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-foreground md:inline px-2 py-1.5"
          >
            Log in
          </Link>

          <Link to="/editor" className="hidden md:inline-flex">
            <Btn className="h-10">Start creating</Btn>
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04] md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {open && (
        <div className="border-b border-border bg-background/95 backdrop-blur-2xl md:hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col px-6 py-5 max-h-[calc(100dvh-5rem)] overflow-y-auto">
            {navLinks.map((l) => {
              if (l.isHash) {
                return (
                  <a
                    key={l.label}
                    href={l.to}
                    onClick={(e) => handleHashClick(e, l.hashId)}
                    className="border-b border-border/60 py-3.5 font-mono text-xs tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground"
                  >
                    {l.label}
                  </a>
                );
              }

              return (
                <Link
                  key={l.label}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`border-b border-border/60 py-3.5 font-mono text-xs tracking-[0.16em] uppercase ${
                    currentPath === l.to
                      ? "text-brand-orange font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}

            {/* Mobile Auth and Action Links */}
            <div className="pt-2 space-y-1">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-border/60 py-3.5 font-mono text-xs tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground"
              >
                <span>Log in</span>
                <span className="text-brand-orange">→</span>
              </Link>

              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-border/60 py-3.5 font-mono text-xs tracking-[0.16em] uppercase text-brand-orange font-semibold hover:text-brand-orange/80"
              >
                <span>Create Account</span>
                <span className="text-brand-orange">→</span>
              </Link>
            </div>

            <Link to="/editor" onClick={() => setOpen(false)} className="mt-5 w-full">
              <Btn className="w-full">Start creating</Btn>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
