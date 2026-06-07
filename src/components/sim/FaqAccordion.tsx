"use client";

import { useState } from "react";

// Accessible FAQ accordion with a smooth open/close animation. Uses the
// grid-rows 0fr→1fr trick so the answer height animates without measuring,
// while the answer text stays in the DOM (SEO/accessibility). Each item
// toggles independently (same as the old <details> elements). Honors
// prefers-reduced-motion via the global transition override.
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="mt-5 space-y-3">
      {items.map((f, i) => {
        const isOpen = open.has(i);
        return (
          <div key={f.q} className="overflow-hidden rounded-xl border border-line bg-panel/60 transition-colors hover:border-steel">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left font-display text-base font-bold text-fg"
            >
              {f.q}
              <span className={`shrink-0 text-lg leading-none text-muted transition-transform duration-300 ${isOpen ? "rotate-45 text-fg" : ""}`}>+</span>
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
