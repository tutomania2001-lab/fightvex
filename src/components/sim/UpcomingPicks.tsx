"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PickResultHero } from "./PickResultHero";
import { PickCardMenu } from "./PickCardMenu";
import { PickVerify } from "./PickVerify";
import { usePicks, fmtPicksDate, tabReveal, stagger, staggerItem } from "./usePicks";

// Locked-in Vex AI picks for fights that HAVEN'T happened yet — proof the model
// committed before the result. Pick a card from the menu to open its picks.
// Settled picks live in the Past Picks tab.
export function UpcomingPicks() {
  const { state, data } = usePicks();
  const [sel, setSel] = useState(0);

  if (state === "loading") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-panel-2/40" />)}
      </div>
    );
  }
  if (state === "error" || !data || !data.enabled) {
    return <p className="rounded-xl border border-line bg-panel/60 p-5 text-sm text-muted">Pick tracking isn&apos;t available right now.</p>;
  }
  if (data.upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel/60 p-6">
        <h3 className="font-display text-xl font-bold uppercase">No upcoming picks locked in</h3>
        <p className="mt-2 text-sm text-muted">
          Each card&apos;s Vex AI picks are logged here <b>before</b> the fights — committed in advance, never back-dated.
          Nothing&apos;s locked in right now; check back closer to the next card. Settled results move to the{" "}
          <b className="text-fg">Past Picks</b> tab.
        </p>
      </div>
    );
  }

  const i = Math.min(sel, data.upcoming.length - 1);
  const c = data.upcoming[i];
  return (
    <motion.div className="space-y-4" variants={tabReveal} initial="hidden" animate="show">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-edge/40 bg-edge/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-edge">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="3.5" y="7" width="9" height="6.3" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Locked in
        </span>
        <p className="text-xs text-muted">Committed <b className="text-fg">before</b> the fight · graded results move to Past Picks</p>
      </div>

      <PickCardMenu cards={data.upcoming} selected={i} onSelect={setSel} />

      <div className="overflow-hidden rounded-2xl border border-line/70 bg-panel/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 bg-bg/40 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold uppercase sm:text-lg">{c.eventName}</h3>
            <p className="text-[11px] uppercase tracking-wider text-muted">{fmtPicksDate(c.date)}</p>
          </div>
          <span className="shrink-0 rounded-full border border-edge/40 px-3 py-1 text-xs font-bold text-edge">
            {c.picks.length} pick{c.picks.length === 1 ? "" : "s"} locked
          </span>
        </div>
        <PickVerify commit={data.commitments?.find((x) => x.eventSlug === c.eventSlug)} />
        <motion.div key={c.eventSlug} className="space-y-5 p-4 sm:p-5" variants={stagger} initial="hidden" animate="show">
          {c.picks.map((p) => (
            <motion.div key={p.boutId} variants={staggerItem}>
              <PickResultHero
                a={p.a} b={p.b} probA={p.probA} confidence={p.confidence}
                winnerName={p.pickName} method={p.predMethod}
                status={{ kind: "pending" }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
