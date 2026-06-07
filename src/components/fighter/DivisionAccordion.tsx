"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import type { Fighter } from "@/lib/types";
import { FighterCard } from "@/components/fighter/FighterCard";
import { ChampionCard } from "@/components/fighter/ChampionCard";

const EASE = [0.4, 0, 0.2, 1] as const;

// Animated height/opacity collapse used for every expandable section.
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="c"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.22 } }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Fighter grid with a gentle staggered fade-in on reveal.
function CardGrid({ fighters }: { fighters: Fighter[] }) {
  return (
    <motion.div
      className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={{ show: { transition: { staggerChildren: 0.035 } } }}
      initial="hidden"
      animate="show"
    >
      {fighters.map((f) => (
        <motion.div key={f.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}>
          <FighterCard fighter={f} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function Chevron({ open, size = 16 }: { open: boolean; size?: number }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0 text-muted" aria-hidden
      animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

export function DivisionAccordion({ divisions }: { divisions: { wc: string; count: number }[] }) {
  if (divisions.length === 0) {
    return <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">No divisions available from ESPN.</p>;
  }
  return (
    <div className="space-y-3">
      {divisions.map((d) => <DivisionSection key={d.wc} wc={d.wc} count={d.count} />)}
    </div>
  );
}

function SubTab({ title, fighters, defaultOpen = false }: { title: string; fighters: Fighter[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-panel-2/40 px-4 py-3 text-left transition-colors hover:bg-panel-2/60"
      >
        <span className="font-display text-sm font-bold uppercase tracking-wide text-fg">{title}</span>
        <span className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-faint">{fighters.length} fighter{fighters.length === 1 ? "" : "s"}</span>
          <Chevron open={open} size={14} />
        </span>
      </button>
      <Collapse open={open}>
        <div className="border-t border-line p-4">
          <CardGrid fighters={fighters} />
        </div>
      </Collapse>
    </div>
  );
}

function DivisionSection({ wc, count }: { wc: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [fighters, setFighters] = useState<Fighter[]>([]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && state === "idle") {
      setState("loading");
      fetch(`/api/fighters/by-division?wc=${encodeURIComponent(wc)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => { setFighters(d.fighters || []); setState("ready"); })
        .catch(() => setState("error"));
    }
  }

  const ranked = fighters.filter((f) => f.ranking != null);  // champion (rank 0) + contenders
  const top1 = ranked[0];
  const restRanked = ranked.slice(1);

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-panel px-5 py-4 text-left transition-colors hover:bg-panel-2/60"
      >
        <span className="font-display text-lg font-bold uppercase tracking-wide">{wc}</span>
        <span className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-muted">{count} fighter{count === 1 ? "" : "s"}</span>
          <Chevron open={open} />
        </span>
      </button>

      <Collapse open={open}>
        <div className="border-t border-line p-4">
          {state === "loading" && (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
              {Array.from({ length: Math.min(count || 4, 8) }).map((_, i) => (
                <div key={i} className="h-[180px] animate-pulse rounded-xl bg-panel-2/50" />
              ))}
            </div>
          )}
          {state === "error" && (
            <p className="rounded-lg border border-blood/30 bg-blood/5 p-4 text-sm text-blood">
              Couldn’t load this division. Please try again.
            </p>
          )}
          {state === "ready" && fighters.length === 0 && (
            <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">No fighters available for this division.</p>
          )}
          {state === "ready" && fighters.length > 0 && (
            <div className="space-y-4">
              {/* #1 alone on top, outside the tabs */}
              {top1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                  <ChampionCard fighter={top1} />
                </motion.div>
              )}
              {restRanked.length > 0 && <SubTab title="Ranked Contenders" fighters={restRanked} />}
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}
