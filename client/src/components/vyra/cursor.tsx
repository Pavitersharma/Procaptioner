import { useEffect, useRef, useState } from "react";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setOn(true);
    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const t = (e.target as HTMLElement)?.closest?.("[data-cursor]") as HTMLElement | null;
      if (t) {
        setLabel(t.getAttribute("data-cursor") || null);
        setBig(true);
      } else if ((e.target as HTMLElement)?.closest?.("a,button,input,[role='button']")) {
        setLabel(null);
        setBig(true);
      } else {
        setLabel(null);
        setBig(false);
      }
    };
    const loop = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      if (dot.current)
        dot.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!on) return null;
  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100] hidden items-center justify-center rounded-full border border-accent font-mono text-[0.55rem] tracking-[0.2em] text-accent mix-blend-difference transition-[width,height,background-color] duration-200 md:flex"
      style={{
        width: label ? 72 : big ? 34 : 8,
        height: label ? 72 : big ? 34 : 8,
        backgroundColor: label || big ? "transparent" : "var(--accent)",
      }}
    >
      {label}
    </div>
  );
}
