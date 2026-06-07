"use client";

// Newest ⇄ Oldest sort control, shared by the news feeds.
export function SortToggle({ newestFirst, onToggle }: { newestFirst: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Sort by date: ${newestFirst ? "newest first" : "oldest first"} (tap to flip)`}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-steel hover:text-fg"
    >
      {newestFirst ? "Newest" : "Oldest"}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={newestFirst ? "" : "rotate-180"} aria-hidden>
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </button>
  );
}
