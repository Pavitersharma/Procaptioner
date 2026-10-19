import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true);
        });
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", className)}
    >
      {children}
    </div>
  );
}

import { ProCaptionerLogo, ProCaptionerMonogram } from "@/components/brand/pro-captioner-logo";
export { ProCaptionerLogo, ProCaptionerMonogram };

export function Logo({
  className,
  showWord = true,
  size = "md",
}: {
  className?: string;
  showWord?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  if (!showWord) {
    return <ProCaptionerMonogram size={24} className={className} />;
  }
  return <ProCaptionerLogo size={size} className={className} />;
}

export function Magnetic({
  children,
  className,
  strength = 0.35,
  as = "span",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  as?: "span" | "a";
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = as as "span";
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      onMouseMove={(e: React.MouseEvent) => {
        const el = ref.current;
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (el) el.style.transform = "translate(0,0)";
      }}
      className={cn(
        "inline-block transition-transform duration-300 ease-out will-change-transform",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionTag({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="label-mono flex items-center gap-3">
      <span className="text-accent">{index}</span>
      <span className="h-px w-8 bg-border" />
      <span>{children}</span>
    </div>
  );
}

export function Btn({
  children,
  variant = "solid",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: "solid" | "ghost" | "line";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-12 items-center justify-center gap-3 px-6 font-mono text-[0.7rem] tracking-[0.18em] uppercase transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        variant === "solid" && "bg-accent text-accent-foreground hover:bg-accent-soft",
        variant === "line" && "border border-border text-foreground hover:border-accent",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
