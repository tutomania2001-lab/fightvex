"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Card = { short: string; date: string; firstPage: number };

// Self-contained board pager. The whole tab (title, description, board, button)
// fits one screen with NO page scrolling — the board is fixed to the available
// height and its pages SWAP in place (wheel or arrow keys ↑/← prev, ↓/→ next).
// "Extend" SWAPS the board out for the four betting tools in the SAME place
// (board dissolves, tools come up) laid out 2×2 so they all fit one screen too —
// the user never scrolls the page, only pages through the board.
export function BettingStage({ boardSections, tools, cards = [], pageCardIndex = [] }: { boardSections: ReactNode[]; tools: ReactNode; cards?: Card[]; pageCardIndex?: number[] }) {
  const N = Math.max(1, boardSections.length);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const openRef = useRef(false);
  const lockRef = useRef(false);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { openRef.current = open; }, [open]);
  const change = (dir: number) => setPage((p) => clamp(p + dir, 0, N - 1));

  // Wheel over the board pages through it (throttled), unless the tools are open.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (openRef.current) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 6) return;
      const dir = delta > 0 ? 1 : -1;
      const cur = pageRef.current;
      if ((dir > 0 && cur >= N - 1) || (dir < 0 && cur <= 0)) return;
      e.preventDefault();
      if (lockRef.current) return;
      lockRef.current = true;
      window.setTimeout(() => { lockRef.current = false; }, 420);
      setPage((p) => clamp(p + dir, 0, N - 1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [N]);

  useEffect(() => { boardRef.current?.focus({ preventScroll: true }); }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); change(1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); change(-1); }
  };

  const activeCard = pageCardIndex[page] ?? -1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Card menu — one short tab per event; jumps to that card's first slide
          and stays highlighted while the current page is inside that card. */}
      {!open && cards.length > 1 && (
        <div className="mb-2.5 flex shrink-0 items-stretch gap-2">
          {cards.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(c.firstPage)}
              aria-current={activeCard === i}
              title={`${c.short} · ${c.date}`}
              className={`btn-toggle flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeCard === i ? "is-on text-fg" : "text-fg/80"}`}
            >
              <span className="opacity-50">{i + 1}</span>
              <span className="truncate">{c.short}</span>
            </button>
          ))}
        </div>
      )}

      {/* Stage — board and tools occupy the SAME space; Extend crossfades them. */}
      <div className="relative min-h-0 flex-1">
        {/* Board view */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            opacity: open ? 0 : 1,
            transform: open ? "translateY(-10px) scale(0.985)" : "translateY(0) scale(1)",
            pointerEvents: open ? "none" : "auto",
            transition: "opacity 380ms cubic-bezier(0.22,1,0.36,1), transform 380ms cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform",
          }}
          aria-hidden={open}
        >
          <div
            ref={boardRef}
            tabIndex={open ? -1 : 0}
            onKeyDown={onKeyDown}
            role="group"
            aria-label="Odds board — use arrow keys or scroll to change page"
            className="relative min-h-0 flex-1 overflow-hidden rounded-2xl outline-none focus:outline-none focus-visible:outline-none"
          >
            {boardSections.map((s, i) => (
              <div
                key={i}
                className="absolute inset-0 flex flex-col justify-center transition-all duration-300"
                style={{
                  opacity: i === page ? 1 : 0,
                  transform: `translateY(${(i - page) * 16}px) scale(${i === page ? 1 : 0.985})`,
                  pointerEvents: i === page ? "auto" : "none",
                }}
                aria-hidden={i !== page}
              >
                {s}
              </div>
            ))}
          </div>

          {N > 1 && (
            <div className="mt-2.5 flex shrink-0 items-center justify-center gap-1.5">
              {boardSections.map((_, i) => (
                <button key={i} type="button" onClick={() => setPage(i)} aria-label={`Page ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === page ? "w-5 bg-fg" : "w-1.5 bg-line hover:bg-steel"}`} />
              ))}
            </div>
          )}
        </div>

        {/* Tools view — the fight desk fills the same area (its own internal
            layout: fight selector + the four auto-filled tools). It settles in
            from just below as the board lifts away, for a clean swap. */}
        <div
          className="absolute inset-0"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.985)",
            pointerEvents: open ? "auto" : "none",
            transition: "opacity 380ms cubic-bezier(0.22,1,0.36,1), transform 380ms cubic-bezier(0.22,1,0.36,1)",
            willChange: "opacity, transform",
          }}
          aria-hidden={!open}
        >
          {tools}
        </div>
      </div>

      {/* Extend / Back button. */}
      <div className="relative z-10 mt-3 flex shrink-0 flex-col items-center">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-flare flex items-center gap-2 rounded-md px-7 py-2.5 text-sm font-bold uppercase tracking-wide">
          {open ? "Back to board" : "Extend · Betting tools"}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className={`transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {!open && <p className="mt-1.5 text-[11px] uppercase tracking-wider text-faint">Line movement · EV · CLV · Bankroll</p>}
      </div>
    </div>
  );
}
