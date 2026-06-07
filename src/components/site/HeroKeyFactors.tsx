"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The fight key-factor ticks (e.g. "Bonfim is a submission threat (13 sub wins)").
// They show side-by-side on ONE row when they all fit in the left text column,
// and otherwise stack vertically — all-or-nothing, never a ragged partial wrap
// that would spill over the fighters/background area on the right.
//
// We measure each tick's natural (single-line) width and compare the total
// + gaps against the container width, so the decision is content-aware (not a
// fixed breakpoint) and re-runs on resize.
const GAP = 16; // matches gap-x-4 (1rem)
const isoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function HeroKeyFactors({ factors }: { factors: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState(false);

  isoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      // scrollWidth of each tick = its single-line content width (the ticks are
      // whitespace-nowrap), independent of whether we're currently row or column.
      const needed = kids.reduce((sum, k) => sum + k.scrollWidth, 0) + GAP * Math.max(0, kids.length - 1);
      setStack(needed > el.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [factors]);

  if (factors.length === 0) return null;

  return (
    <div
      ref={ref}
      className={`mt-5 flex gap-x-4 gap-y-2 ${stack ? "flex-col items-start" : "flex-row flex-nowrap items-center"}`}
    >
      {factors.map((f) => (
        <span key={f} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="shrink-0">
            <circle cx="5" cy="5" r="4.5" stroke="#e10600" strokeWidth="1" />
            <path d="M3 5l1.5 1.5L7 3.5" stroke="#e10600" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {f}
        </span>
      ))}
    </div>
  );
}
