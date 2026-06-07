"use client";

import { useState } from "react";

// Compact info button that marks a value's provenance. `estimate`/`odds` are
// model-derived (amber ⚠). `market` flags REAL web-sourced sportsbook lines
// (neutral ⓘ). Click or hover to read the full note.
export function ModelTag({
  kind = "estimate",
  source,
  className = "",
}: {
  kind?: "estimate" | "odds" | "market" | "espn";
  source?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isNeutral = kind === "market" || kind === "espn";
  const label =
    kind === "espn"
      ? "Official ESPN per-fight statistics (recent fights) — real, not estimated"
      : kind === "market"
      ? `Real market odds${source ? ` — ${source}` : ""} · informational, not betting advice`
      : kind === "odds"
      ? "Model-implied — not real sportsbook lines"
      : "Model estimate — not official ESPN data";
  const tone = isNeutral
    ? "border-steel/40 bg-steel/10 text-steel hover:bg-steel/20"
    : "border-amber/40 bg-amber/10 text-amber hover:bg-amber/20";
  const tip = isNeutral ? "border-steel/40 text-steel" : "border-amber/40 text-amber";
  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] leading-none transition-colors ${tone}`}
      >
        {isNeutral ? "ⓘ" : "⚠"}
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute bottom-full right-0 z-50 mb-1 w-max max-w-[240px] rounded-md border bg-bg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider shadow-lg ${tip}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
