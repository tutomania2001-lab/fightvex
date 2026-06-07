"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PickResultHero } from "./PickResultHero";
import { PickCardMenu } from "./PickCardMenu";
import { PickVerify } from "./PickVerify";
import { usePicks, fmtPicksDate, pctRound, tabReveal, stagger, staggerItem } from "./usePicks";

// SETTLED picks only — logged before the fight, graded against the real result.
// Pick a past card from the menu to open it. Locked-in picks live in Upcoming.
export function PastPicks() {
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
    return <p className="rounded-xl border border-line bg-panel/60 p-5 text-sm text-muted">Past-pick tracking isn&apos;t available right now.</p>;
  }
  if (data.cards.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel/60 p-6">
        <h3 className="font-display text-xl font-bold uppercase">No settled picks yet</h3>
        <p className="mt-2 text-sm text-muted">
          Every Vex AI pick is logged <b>before</b> its card and graded against the real result afterward — never
          back-dated, so this stays empty until the first logged card settles.{" "}
          {data.upcoming.length > 0
            ? <>The <b className="text-fg">Upcoming</b> tab shows {data.pending} pick{data.pending === 1 ? "" : "s"} locked in for the next card.</>
            : <>Currently tracking <b className="text-fg">{data.pending}</b> upcoming pick{data.pending === 1 ? "" : "s"}.</>}
        </p>
      </div>
    );
  }

  const total = data.cards.reduce((s, c) => s + c.total, 0);
  const correct = data.cards.reduce((s, c) => s + c.correct, 0);
  const i = Math.min(sel, data.cards.length - 1);
  const c = data.cards[i];
  const acc = c.total ? c.correct / c.total : 0;

  return (
    <motion.div className="space-y-4" variants={tabReveal} initial="hidden" animate="show">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <b className="text-fg">{correct}/{total}</b> winner picks correct across {data.cards.length} settled card{data.cards.length === 1 ? "" : "s"}
          {data.pending > 0 ? <> · {data.pending} more pending in Upcoming</> : null}
        </p>
        <Link href="/accuracy" className="text-xs font-semibold uppercase tracking-wider text-blood hover:underline">Full accuracy record →</Link>
      </div>

      <PickCardMenu cards={data.cards} selected={i} onSelect={setSel} />

      <div className="overflow-hidden rounded-2xl border border-line/70 bg-panel/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 bg-bg/40 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold uppercase sm:text-lg">{c.eventName}</h3>
            <p className="text-[11px] uppercase tracking-wider text-muted">{fmtPicksDate(c.date)}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold tabular-nums ${acc >= 0.6 ? "border-edge/50 text-edge" : acc >= 0.4 ? "border-amber/50 text-amber" : "border-blood/50 text-blood"}`}>
            {c.correct}/{c.total} · {pctRound(acc)}
          </span>
        </div>
        <PickVerify commit={data.commitments?.find((x) => x.eventSlug === c.eventSlug)} />
        <motion.div key={c.eventSlug} className="space-y-5 p-4 sm:p-5" variants={stagger} initial="hidden" animate="show">
          {c.picks.map((p) => (
            <motion.div key={p.boutId} variants={staggerItem}>
              <PickResultHero
                a={p.a} b={p.b} probA={p.probA} confidence={p.confidence}
                winnerName={p.pickName} method={p.predMethod}
                status={{ kind: "graded", correct: p.correctWinner, actualName: p.actualWinnerName, actualMethod: p.actualMethod }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
