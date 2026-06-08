"use client";

import { useEffect, useState } from "react";
import { BACKTEST } from "@/lib/data/backtest.generated";
import { CommitVerify } from "@/components/CommitVerify";
import type { Commitment } from "@/lib/commit";

// Inline version of the /accuracy page for the Simulator's Accuracy tab — so the
// tab bar stays visible. Shows the static historical backtest immediately, then
// the live pre-registered record (fetched from /api/accuracy, like Past Picks).

type Cal = { bucket: string; predicted: number; actual: number; n: number };
type Record = {
  enabled: boolean; graded: number; pending: number;
  winAccuracy: number | null; methodAccuracy: number | null; methodGraded: number;
  brier: number | null; logLoss: number | null; calibration: Cal[];
  commitments?: Commitment[];
};

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "fg" | "edge" }) {
  return (
    <div className="rounded-xl border border-line/60 bg-panel/60 p-4">
      <p className={`font-display text-2xl font-bold ${tone === "edge" ? "text-edge" : "text-fg"}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-fg/80">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted">{sub}</p>
    </div>
  );
}

function Calibration({ rows }: { rows: Cal[] }) {
  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <div key={c.bucket} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="tnum text-muted">{c.bucket}</span>
          <div className="relative h-2 rounded bg-panel-2">
            <div className="absolute inset-y-0 left-0 rounded bg-edge/60" style={{ width: pct1(c.actual) }} />
            <div className="absolute inset-y-[-3px] w-0.5 bg-fg" style={{ left: pct1(c.predicted) }} title="predicted" />
          </div>
          <span className="tnum text-xs text-muted">{pct1(c.actual)} actual · n={c.n}</span>
        </div>
      ))}
    </div>
  );
}

export function AccuracyPanel() {
  const [rec, setRec] = useState<Record | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetch("/api/accuracy")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setRec(d); setState("ready"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="reveal space-y-8">
      {/* 1) LIVE RECORD — real pre-registered picks, graded. Shown first. */}
      {state === "loading" && <div className="h-28 animate-pulse rounded-xl bg-panel-2/40" />}
      {state === "ready" && rec?.enabled && rec.graded > 0 && (
        <section>
          <h3 className="mb-1 font-display text-lg font-bold uppercase">Live record · {rec.graded} graded</h3>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Aggregate of real picks logged <b>before</b> each fight (the per-fight breakdown is under <b>Past Picks</b>).
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Winner picks" value={rec.winAccuracy != null ? pct1(rec.winAccuracy) : "—"} sub={`${rec.graded} graded`} tone="fg" />
            <Metric label="Method picks" value={rec.methodAccuracy != null ? pct1(rec.methodAccuracy) : "—"} sub={`${rec.methodGraded} verifiable`} tone="fg" />
            <Metric label="Brier" value={rec.brier != null ? rec.brier.toFixed(3) : "—"} sub="0.25 = coin flip" tone="edge" />
            <Metric label="Log loss" value={rec.logLoss != null ? rec.logLoss.toFixed(3) : "—"} sub="0.69 = coin flip" tone="edge" />
          </div>
          {rec.calibration.length > 0 && (
            <div className="mt-4"><Calibration rows={rec.calibration} /></div>
          )}
        </section>
      )}
      {state === "ready" && (!rec?.enabled || rec.graded === 0) && (
        <section className="rounded-xl border border-line/60 bg-panel/40 p-4">
          <h3 className="font-display text-lg font-bold uppercase">Live record · building</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted">No fights graded yet — every pick is logged before its card and graded after, so the live numbers fill in as cards settle. The validated backtest below is the baseline.</p>
        </section>
      )}

      {/* 2) HISTORICAL BACKTEST — always available (static, real). */}
      <section>
        <h3 className="mb-1 font-display text-lg font-bold uppercase">Historical backtest · {BACKTEST.backtested.toLocaleString()} real bouts</h3>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Every bout&apos;s inputs rebuilt from only the fighters&apos; prior fights — no hindsight — across {BACKTEST.yearFrom}–{BACKTEST.yearTo}
          ({BACKTEST.fighters.toLocaleString()} fighters), then graded against the real result.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Winner picks" value={pct1(BACKTEST.accuracy)} sub={`${BACKTEST.backtested.toLocaleString()} bouts`} tone="fg" />
          <Metric label="Recent (held-out)" value={pct1(BACKTEST.accuracyRecent)} sub="never tuned on" tone="fg" />
          <Metric label="Log loss" value={BACKTEST.logLoss.toFixed(3)} sub="0.69 = coin flip" tone="edge" />
          <Metric label="Brier" value={BACKTEST.brier.toFixed(3)} sub="0.25 = coin flip" tone="edge" />
        </div>
        <h4 className="mb-1 mt-5 font-display text-sm font-bold uppercase tracking-wide">Calibration</h4>
        <p className="mb-3 text-xs text-muted">When Vex AI said X%, how often it actually happened. Closer = better.</p>
        <Calibration rows={BACKTEST.calibration} />
      </section>

      {/* 3) LOCKED FIGHTS — Bitcoin-anchored proof, last. */}
      {state === "ready" && rec?.commitments && rec.commitments.length > 0 && (
        <section>
          <h3 className="mb-1 font-display text-lg font-bold uppercase">₿ Locked before the fights — verify it yourself</h3>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Each card&apos;s picks are hashed and anchored in <b className="text-fg">Bitcoin</b> before the event. Recompute the
            hash in your own browser and confirm it matches — we can&apos;t back-date.
          </p>
          <div className="space-y-4">
            {rec.commitments.map((c) => <CommitVerify key={c.eventSlug} c={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
