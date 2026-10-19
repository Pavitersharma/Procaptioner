import { Link } from "@tanstack/react-router";
import {
  Type,
  Palette,
  SlidersHorizontal,
  Clock,
  HardDrive,
  Download,
  RefreshCw,
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SectionTag } from "./primitives";

export const CREATOR_PRO_FEATURES = [
  {
    icon: Type,
    title: "All Fonts Unlocked for Preview",
    description: "Try free and premium fonts inside the editor before subscribing.",
  },
  {
    icon: Palette,
    title: "All Templates Available",
    description: "Explore subtitle styles, animations, colors and effects.",
  },
  {
    icon: SlidersHorizontal,
    title: "Full Editing Controls",
    description: "Adjust font size, color, position, outline, shadow and timing.",
  },
  {
    icon: Clock,
    title: "Up to 3-Minute Videos",
    description: "Create and edit videos with a maximum duration of 3 minutes per video.",
  },
  {
    icon: HardDrive,
    title: "5 GB Project Storage",
    description: "Store uploaded videos, project files and related assets within your storage limit.",
  },
  {
    icon: Download,
    title: "Professional Video Export",
    description: "Export completed videos without a watermark, with the supported output quality.",
  },
  {
    icon: RefreshCw,
    title: "Monthly Subscription",
    description: "Maintain access to export features while your subscription is active.",
  },
] as const;

export function Pricing({ heading = true }: { heading?: boolean }) {
  return (
    <section id="pricing" className="border-t border-border py-20 md:py-32 font-sans">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        {heading && (
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 md:mb-20">
            <div className="inline-flex items-center justify-center">
              <SectionTag index="08">Pricing</SectionTag>
            </div>
            <h2 className="text-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-extrabold tracking-tight text-white leading-tight">
              One simple plan.
              <br />
              <span className="text-muted-foreground">Everything you need to create.</span>
            </h2>
          </div>
        )}

        {/* ── Creator Pro Plan Card Container ── */}
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#131316] via-[#0e0e11] to-[#08080a] p-6 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Ambient Brand Glow */}
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#ff7a1a]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#ff7a1a]/10 blur-3xl pointer-events-none" />

            {/* Top Header Area */}
            <div className="relative z-10 text-center space-y-3 pb-8 border-b border-white/[0.08]">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a1a]/30 bg-[#ff7a1a]/10 px-3.5 py-1 font-mono text-[0.68rem] font-bold tracking-widest text-[#ff7a1a] uppercase shadow-sm shadow-orange-500/10">
                <Sparkles className="h-3.5 w-3.5" />
                <span>One Simple Plan</span>
              </div>

              {/* Title & Price */}
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Creator Pro
              </h3>

              <div className="flex items-baseline justify-center gap-1.5 pt-1">
                <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight">
                  ₹199
                </span>
                <span className="font-mono text-sm sm:text-base text-neutral-400">
                  /month
                </span>
              </div>

              {/* Subtext */}
              <p className="max-w-lg mx-auto text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Explore every style. Create your video. Subscribe when you&apos;re ready to export.
              </p>

              {/* CTA Button */}
              <div className="pt-4 max-w-md mx-auto">
                <Link
                  to="/signup"
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] py-3.5 px-6 font-mono text-xs sm:text-sm font-bold tracking-[0.14em] text-black uppercase shadow-lg shadow-orange-500/25 transition-all duration-200 hover:bg-[#ff5b00] active:scale-[0.98] cursor-pointer"
                >
                  <Zap className="h-4 w-4" />
                  <span>Unlock Export — ₹199/month</span>
                </Link>
              </div>
            </div>

            {/* Features Checklist */}
            <div className="relative z-10 divide-y divide-white/[0.06] pt-6 sm:pt-8">
              {CREATOR_PRO_FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start justify-between gap-4 py-4 sm:py-5 first:pt-0 last:pb-0 group"
                  >
                    <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                      {/* Icon */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#ff7a1a] group-hover:border-[#ff7a1a]/40 group-hover:bg-[#ff7a1a]/10 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Title & Description */}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-white group-hover:text-[#ff7a1a] transition-colors">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Checkmark */}
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#ff7a1a]/50 bg-[#ff7a1a]/15 text-[#ff7a1a] mt-0.5 shadow-sm shadow-orange-500/10">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Billing Terms Note */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/[0.08] text-center space-y-3">
              <p className="text-[0.72rem] sm:text-xs text-neutral-500 leading-relaxed">
                ₹199 billed monthly. Subscription cancellation and renewal terms should be shown clearly at checkout.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 text-[0.68rem] font-mono text-neutral-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ff7a1a]" />
                  Secure Checkout
                </span>
                <span>•</span>
                <span>Watermark-Free HD Export</span>
                <span>•</span>
                <span>Instant Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
