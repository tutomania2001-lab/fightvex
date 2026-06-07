"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// On every tab change, kick the background flares into a fast surge and then
// ease their speed back to the normal slow drift. Uses the Web Animations API
// playbackRate (not animation-duration) so the speed ramps smoothly with no
// keyframe jump. The flares live in the persistent layout, so this controller
// does too — it just watches the pathname. Honours prefers-reduced-motion.
const BOOST = 8; // peak speed multiplier at the moment of the tab change
const RESTORE_MS = 1100; // time to glide back down to 1×
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function FlareSpeed() {
  const pathname = usePathname();
  const first = useRef(true);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // Skip the initial page load — only react to actual tab changes.
    if (first.current) {
      first.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const anims = Array.from(document.querySelectorAll<HTMLElement>(".fv-flare")).flatMap((el) =>
      el.getAnimations(),
    );
    if (!anims.length) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / RESTORE_MS);
      const rate = BOOST - (BOOST - 1) * easeOut(t);
      for (const a of anims) a.playbackRate = rate;
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        for (const a of anims) a.playbackRate = 1;
      }
    };
    for (const a of anims) a.playbackRate = BOOST;
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [pathname]);

  return null;
}
