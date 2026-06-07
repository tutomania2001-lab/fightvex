import type { Metadata } from "next";
import Link from "next/link";
import { getRecord } from "@/lib/predictions";
import { getCommitments } from "@/lib/commit";
import { BACKTEST } from "@/lib/data/backtest.generated";
import { CommitVerify } from "@/components/CommitVerify";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Vex AI Verified Accuracy Record",
  description:
    "The real, verified track record of Vex AI fight predictions — every pick logged before the fight and graded against the actual result. No marketing numbers, no back-dating.",
  alternates: { canonical: "/accuracy" },
};

// ISR (not force-dynamic): the verified record only changes via the cron grader,
// so a 5-min cache keeps the heavy Redis MGET off the per-request hot path.
export const revalidate = 300;

const ET = "America/New_York";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: ET, month: "short", day: "numeric", year: "numeric" });
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

export default async function AccuracyPage() {
  const r = await getRecord();
  const commitments = await getCommitments();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="reveal mb-8">
        <Badge variant="blood">Verified · {r.modelVersion}</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Vex AI Accuracy Record</h1>
        <p className="mt-2 max-w-2xl text-muted">
          The honest version: every Vex AI pick is logged <b>before</b> the fight and graded against the
          <b> real result</b> afterward. We never back-date a prediction and we never publish a number we
          can&apos;t verify. This page is that record — live.
        </p>
      </div>

      {/* Historical backtest — distinct from the live pre-registered record below. */}
      <Panel className="reveal mb-8 p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="edge">Historical backtest</Badge>
          <h2 className="font-display text-xl font-bold uppercase">{BACKTEST.backtested.toLocaleString()} real UFC bouts, replayed</h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          We rebuilt every bout&apos;s inputs from <b className="text-fg">only the fighters&apos; prior fights</b> — no hindsight — across{" "}
          {BACKTEST.yearFrom}–{BACKTEST.yearTo} ({BACKTEST.fighters.toLocaleString()} fighters), then ran the live engine and graded it
          against the real result. This is the model proving itself on history; the section below is the live record on fights it predicts <i>going forward</i>.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Winner picks" value={pct1(BACKTEST.accuracy)} sub={`${BACKTEST.backtested.toLocaleString()} bouts replayed`} tone="fg" />
          <Metric label={`Recent ${BACKTEST.yearTo - 2}–${BACKTEST.yearTo}`} value={pct1(BACKTEST.accuracyRecent)} sub="held-out — never tuned on" tone="fg" />
          <Metric label="Log loss" value={BACKTEST.logLoss.toFixed(3)} sub="lower is better · 0.69 = coin flip" tone="edge" />
          <Metric label="Brier score" value={BACKTEST.brier.toFixed(3)} sub="lower is better · 0.25 = coin flip" tone="edge" />
        </div>
        <h3 className="mb-1 mt-6 font-display text-sm font-bold uppercase tracking-wide">Calibration</h3>
        <p className="mb-3 text-xs text-muted">When Vex AI said a fighter wins X%, how often they actually won across these bouts. Closer = better.</p>
        <div className="space-y-2">
          {BACKTEST.calibration.map((c) => (
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
        <p className="mt-3 text-[10px] text-faint">
          Bar = actual win rate · tick = predicted. Leakage-free (each fighter&apos;s stats use only their earlier fights); scored when both fighters have ≥2 prior fights. See <Link href="/methodology" className="text-blood hover:underline">methodology</Link>.
        </p>
      </Panel>

      {/* Proof picks were locked BEFORE the fights — anchored in Bitcoin. */}
      <Panel className="reveal mb-8 p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant="edge">₿ Proof of timing</Badge>
          <h2 className="font-display text-xl font-bold uppercase">Picks locked before the fights — verify it yourself</h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Before each card, we hash the exact pick-set and anchor that hash in the <b className="text-fg">Bitcoin blockchain</b> via
          OpenTimestamps. After the fights you can recompute the hash <b>in your own browser</b> (no trust in us) and confirm it
          matches the one Bitcoin timestamped <b>before</b> the event. We literally cannot back-date — the timestamp is set by
          Bitcoin&apos;s miners, not by us.
        </p>
        {commitments.length > 0 ? (
          <div className="space-y-4">
            {commitments.map((c) => <CommitVerify key={c.eventSlug} c={c} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-line bg-bg/50 p-4 text-sm text-muted">
            The first card&apos;s picks are anchored the moment they&apos;re logged (before the fights) — this section fills in
            automatically from the next event onward. Bitcoin confirmation of each anchor takes a few hours.
          </p>
        )}
      </Panel>

      {!r.enabled ? (
        <Panel className="reveal p-6">
          <p className="text-sm text-muted">Accuracy tracking isn&apos;t configured in this environment (no results store connected). Once it is, the verified record builds here automatically.</p>
        </Panel>
      ) : r.graded === 0 ? (
        <Panel className="reveal p-6">
          <h2 className="font-display text-xl font-bold uppercase">No fights graded yet</h2>
          <p className="mt-2 text-sm text-muted">
            The record begins the moment logged predictions resolve. Right now we&apos;re tracking{" "}
            <b className="text-fg">{r.pending}</b> upcoming prediction{r.pending === 1 ? "" : "s"} that will be
            graded against their real results after the fights happen. Check back after the next card.
          </p>
          <p className="mt-3 text-[11px] text-faint">A prediction only ever counts if it was logged before the fight — that&apos;s the whole point.</p>
        </Panel>
      ) : (
        <>
          <div className="reveal-stagger grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Winner picks" value={r.winAccuracy != null ? pct1(r.winAccuracy) : "—"} sub={`${r.graded} graded fight${r.graded === 1 ? "" : "s"}`} tone="fg" />
            <Metric label="Method picks" value={r.methodAccuracy != null ? pct1(r.methodAccuracy) : "—"} sub={`${r.methodGraded} verifiable`} tone="fg" />
            <Metric label="Brier score" value={r.brier != null ? r.brier.toFixed(3) : "—"} sub="lower is better · 0.25 = coin flip" tone="edge" />
            <Metric label="Log loss" value={r.logLoss != null ? r.logLoss.toFixed(3) : "—"} sub="lower is better · 0.69 = coin flip" tone="edge" />
          </div>

          {r.calibration.length > 0 && (
            <Panel className="reveal mt-6 p-6">
              <h2 className="mb-1 font-display text-xl font-bold uppercase">Calibration</h2>
              <p className="mb-4 text-xs text-muted">When Vex AI says a fighter wins X% of the time, how often do they actually win? Closer rows = better calibrated.</p>
              <div className="space-y-2">
                {r.calibration.map((c) => (
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
              <p className="mt-3 text-[10px] text-faint">Bar = actual win rate · tick = predicted. {r.pending} more prediction{r.pending === 1 ? "" : "s"} pending results.</p>
            </Panel>
          )}

          <Panel className="reveal mt-6 p-6">
            <h2 className="mb-4 font-display text-xl font-bold uppercase">Recent graded picks</h2>
            <div className="space-y-2">
              {r.recent.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-bg/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{p.aName} vs {p.bName}</p>
                    <p className="truncate text-[11px] text-muted">{p.eventName} · {fmtDate(p.date)}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="text-muted">Pick: <span className="font-semibold text-fg">{p.pickName.split(" ").slice(-1)[0]}</span> <span className="tnum">{pct1(p.pickProb)}</span> · {p.predMethod}</p>
                    <p className={p.correctWinner ? "font-semibold text-edge" : "font-semibold text-blood"}>
                      {p.correctWinner ? "✓" : "✗"} {p.actualWinnerName.split(" ").slice(-1)[0]} won{p.actualMethod ? ` (${p.actualMethod})` : ""}
                      {p.correctMethod === true ? " · method ✓" : p.correctMethod === false ? " · method ✗" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      <p className="reveal mt-8 rounded-lg border border-line bg-panel/60 p-4 text-[11px] leading-relaxed text-muted">
        Predictions are logged automatically before each card and graded against real results from trusted
        sources. See <Link href="/methodology" className="text-blood hover:underline">how Vex AI works</Link>.
        Probabilistic research/entertainment tool — not betting advice. 21+.
      </p>
    </div>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "fg" | "edge" }) {
  return (
    <div className="reveal rounded-xl border border-line/60 bg-panel/60 p-4">
      <p className={`font-display text-3xl font-bold ${tone === "edge" ? "text-edge" : "text-fg"}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-fg/80">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted">{sub}</p>
    </div>
  );
}
