"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Small "ⓘ" button that reveals an explanation popover. Used to tuck verbose
// help/disclaimer text out of compact UIs (e.g. the betting tools) so they fit
// without scrolling, while keeping the detail one click away.
export function InfoButton({ children, label = "What is this?", className = "" }: { children: ReactNode; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-steel hover:text-fg"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8" cy="4.5" r="0.95" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute right-0 top-7 z-40 w-64 rounded-lg border border-line bg-panel p-3 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-muted shadow-2xl"
        >
          {children}
        </span>
      )}
    </span>
  );
}
