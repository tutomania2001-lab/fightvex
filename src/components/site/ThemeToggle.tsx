"use client";

import { useEffect, useState } from "react";

// Light/dark toggle. The theme class on <html> is set before paint by the
// no-flash script in layout.tsx; this just flips it + persists the choice.
// Outline sun (in dark → switch to light) / moon (in light → switch to dark).
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("light");
    const apply = () => {
      document.documentElement.classList.toggle("light", next);
      try {
        localStorage.setItem("theme", next ? "light" : "dark");
      } catch {
        /* storage blocked — still toggles for this session */
      }
      setLight(next);
    };

    // Animate the swap as a soft, slow cross-fade of the new theme over the old
    // (timing lives in globals.css) — gentle on the eyes, no hard sweeping edge.
    // Falls back to an instant swap where unsupported or with reduced motion.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof doc.startViewTransition !== "function") {
      apply();
      return;
    }
    doc.startViewTransition(apply);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
      className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-line text-fg transition-colors hover:border-steel ${className}`}
    >
      {/* keyed so the icon spins/fades in on each swap (also covers the
          reduced-motion / no-view-transition fallback path). */}
      <span key={light ? "moon" : "sun"} className="theme-icon flex">
        {light ? (
          // moon (outline)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        ) : (
          // sun (outline)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
          </svg>
        )}
      </span>
    </button>
  );
}
