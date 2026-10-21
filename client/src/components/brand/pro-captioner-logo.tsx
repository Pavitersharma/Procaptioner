import React from "react";
import { cn } from "@/lib/utils";

export interface ProCaptionerLogoProps {
  /**
   * "default": Full cohesive wordmark "ProCaptioner"
   * "compact": Typographic "PC" monogram for constrained spaces
   * "responsive": Compact "PC" monogram on small screens, full wordmark on sm+
   */
  variant?: "default" | "compact" | "responsive" | undefined;
  /**
   * Color appearance:
   * "auto" (default): follows CSS / theme context
   * "dark": forces off-white Captioner (for dark backgrounds)
   * "light": forces near-black Captioner (for light surfaces)
   */
  theme?: "auto" | "dark" | "light" | undefined;
  /**
   * Pre-defined sizes or number (pixel size):
   * "xs" (14px), "sm" (16px), "md" (20px, default), "lg" (26px), "xl" (32px)
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number | undefined;
  /**
   * Optional additional CSS classes
   */
  className?: string | undefined;
  /**
   * Accessible label for assistive tech (default: "ProCaptioner")
   */
  accessibleLabel?: string | undefined;
}

const SIZE_STYLES: Record<string, { fontSize: string; monogramSize: number }> = {
  xs: { fontSize: "0.875rem", monogramSize: 20 },
  sm: { fontSize: "1rem", monogramSize: 24 },
  md: { fontSize: "1.25rem", monogramSize: 30 },
  lg: { fontSize: "1.625rem", monogramSize: 38 },
  xl: { fontSize: "2rem", monogramSize: 46 },
};

/**
 * Compact typographic "PC" Monogram
 * Precision vector using Exo 2 & Space Grotesk geometric curves
 */
export function ProCaptionerMonogram({
  size = 28,
  theme = "auto",
  className,
}: {
  size?: number | undefined;
  theme?: "auto" | "dark" | "light" | undefined;
  className?: string | undefined;
}) {
  const cColor = theme === "light" ? "#151515" : theme === "dark" ? "#F5F5F5" : "currentColor";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("brand-monogram shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pro-grad-mono" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8A1D" />
          <stop offset="100%" stopColor="#FF5B00" />
        </linearGradient>
      </defs>
      {/* P: Stylized italic bold in brand orange */}
      <path
        d="M 13 49 L 18.5 15 H 31.5 C 38.5 15 42.5 18.8 41 25 C 39.7 30.5 35 34 29 34 H 22 L 18.8 49 Z M 24.2 27.5 H 29 C 32.5 27.5 34.8 25.8 35.4 23.2 C 36 20.8 34.2 19.5 31 19.5 H 25.8 Z"
        fill="url(#pro-grad-mono)"
      />
      {/* C: Modern geometric arc in contrasting off-white/near-black */}
      <path
        d="M 52.5 25.5 L 47 28 C 45.4 25.2 42.4 23.5 38.5 23.5 C 32.2 23.5 27.6 28.5 29 35.5 C 30.2 41.2 35 44.5 40.5 44.5 C 44.5 44.5 47.8 42.5 49.8 39.2 L 55 42 C 52 47 46.8 50.5 39.8 50.5 C 30.5 50.5 23.5 44.2 22 34.8 C 20.2 25.5 27.2 18 38.5 18 C 44.8 18 49.8 21.2 52.5 25.5 Z"
        fill={cColor}
      />
    </svg>
  );
}

/**
 * ProCaptioner Approved Brand Wordmark & Logo Component
 *
 * Implements:
 * - "Pro" in Exo 2 bold italic, vibrant orange (#FF7A1A)
 * - "Captioner" in Space Grotesk semibold, off-white (#F5F5F5) in dark mode, near-black (#151515) in light mode
 * - Cohesive single wordmark "ProCaptioner" with precise baseline alignment & tracking
 * - "PC" monogram variant for compact & mobile layouts
 */
export function ProCaptionerLogo({
  variant = "default",
  theme = "auto",
  size = "md",
  className,
  accessibleLabel = "ProCaptioner",
}: ProCaptionerLogoProps) {
  const sizeConfig = typeof size === "number" ? null : SIZE_STYLES[size] || SIZE_STYLES["md"];
  const customFontSize = typeof size === "number" ? `${size}px` : sizeConfig?.fontSize;
  const monogramPixelSize = typeof size === "number" ? size * 1.3 : sizeConfig?.monogramSize || 30;

  const themeClass =
    theme === "light"
      ? "brand-logo--light text-neutral-900"
      : theme === "dark"
        ? "brand-logo--dark text-white"
        : "";

  // Render purely the compact PC monogram
  if (variant === "compact") {
    return (
      <span
        className={cn("inline-flex items-center select-none", className)}
        title={accessibleLabel}
        aria-label={accessibleLabel}
        role="img"
      >
        <ProCaptionerMonogram size={monogramPixelSize} theme={theme} />
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    );
  }

  // Render responsive (PC monogram on xs/mobile, full wordmark on sm+)
  if (variant === "responsive") {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label={accessibleLabel}
        role="img"
      >
        <span className="inline-flex sm:hidden">
          <ProCaptionerMonogram size={monogramPixelSize} theme={theme} />
        </span>
        <span
          className={cn("brand-logo hidden sm:inline-flex", themeClass)}
          style={{ fontSize: customFontSize }}
        >
          <span className="brand-logo__pro">Pro</span>
          <span className="brand-logo__captioner">Captioner</span>
        </span>
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    );
  }

  // Default: Full cohesive wordmark
  return (
    <span
      className={cn("brand-logo", themeClass, className)}
      style={{ fontSize: customFontSize }}
      aria-label={accessibleLabel}
      role="img"
    >
      <span className="brand-logo__pro">Pro</span>
      <span className="brand-logo__captioner">Captioner</span>
      <span className="sr-only">{accessibleLabel}</span>
    </span>
  );
}

export default ProCaptionerLogo;
