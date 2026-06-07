"use client";

import { useEffect, useState } from "react";
import { pct } from "@/lib/format";

// Small "i" info button that reveals the Vex AI skill-weighting breakdown in a
// popup, instead of the panel being open all the time.
export function WeightsInfo({ weights }: { weights: [string, number][] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="How Vex AI weights skills"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-steel hover:text-fg"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current font-serif text-[10px] font-bold italic leading-none">i</span>
        How Vex AI weights skills
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="How Vex AI weights skills">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="flair-rb animate-pop relative z-10 w-full max-w-lg rounded-2xl border border-line p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-bold uppercase">How Vex AI weights skills</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-fg"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">
              The composite rating is a transparent weighted blend of nine category sub-scores. These weights are
              <b className="text-fg"> data-fitted</b> on thousands of real historical bouts (then blended with priors so every
              category counts), and published in full below.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {weights.map(([k, w]) => (
                <div key={k} className="flex items-center justify-between rounded-md border border-line bg-panel-2/40 px-3 py-2">
                  <span className="text-sm text-fg">{k}</span>
                  <span className="tnum text-sm font-semibold text-blood">{pct(w)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted">
              Full formulas, calibration approach and missing-data handling are on the{" "}
              <a href="/methodology" className="text-blood underline">methodology page</a>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
