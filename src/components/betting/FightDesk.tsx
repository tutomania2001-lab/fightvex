"use client";

import { useState } from "react";
import Link from "next/link";
import type { Snap } from "@/lib/odds-live";
import { Flag } from "@/components/ui/Flag";
import { InfoButton } from "@/components/ui/InfoButton";
import { FeatureGate } from "@/components/billing/FeatureGate";
import { impliedProb, toDecimal, expectedValue, noVigProbA, fmtOdds, pct, signClass, lastName } from "@/lib/format";

// One fully real bout the desk can analyse: the captured odds series
// (opening → current → any live snapshots) plus the Vex AI win probability.
// Every figure the tools show is sourced from one of these — real market
// lines and our own simulation. Nothing is hand-entered or speculated.
export type DeskFight = {
  id: string;
  eventSlug: string;
  eventName: string;
  weightClass: string;
  rounds: number;
  isTitle: boolean;
  a: { name: string; slug: string; flag: string; country: string };
  b: { name: string; slug: string; flag: string; country: string };
  series: Snap[];      // chronological: [open, current, ...live]; length >= 2
  simProbA: number;    // Vex AI win probability for fighter A (0..1)
};

type Side = "a" | "b";

const FRACTIONS = [
  { k: "Full", v: 1 },
  { k: "Half", v: 0.5 },
  { k: "Quarter", v: 0.25 },
];
const MAX_BET_PCT = 5; // single-bet loss-limit guardrail

const favSide = (f: DeskFight): Side => (f.simProbA >= 0.5 ? "a" : "b");

// ============================================================
// The desk: pick a fight + a fighter, and all four tools read their
// inputs straight off that bout's real data.
// ============================================================
export function FightDesk({ fights, openSource, curSource, live }: {
  fights: DeskFight[];
  openSource: string;
  curSource: string;
  live: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [side, setSide] = useState<Side>(() => (fights[0] ? favSide(fights[0]) : "a"));
  // Personal inputs (NOT fight data) persist as the user pages between fights.
  const [stake, setStake] = useState(100);
  const [bankroll, setBankroll] = useState(1000);
  const [frac, setFrac] = useState(0.5);

  if (!fights.length) {
    return <p className="p-5 text-sm text-muted">No opening-line data captured for this card yet.</p>;
  }

  // Selecting a fight resets the side to that bout's Vex AI favorite.
  const pick = (i: number) => {
    const n = ((i % fights.length) + fights.length) % fights.length;
    setIdx(n);
    setSide(favSide(fights[n]));
  };

  const f = fights[idx];
  const open = f.series[0];
  const cur = f.series[f.series.length - 1];
  const me = side === "a" ? f.a : f.b;

  // Real market prices for the selected side (American moneyline).
  const openOdds = side === "a" ? open.a : open.b;
  const curOdds = side === "a" ? cur.a : cur.b;
  // Vex AI win probability for the selected side.
  const vexProb = side === "a" ? f.simProbA : 1 - f.simProbA;
  const marketImplied = impliedProb(curOdds); // raw (with vig) price-implied %

  // Group fights by card (event) — same order as the rest of the site — so the
  // selector and header make clear which card the chosen bout belongs to.
  const cards: { slug: string; name: string; items: { fx: DeskFight; i: number }[] }[] = [];
  fights.forEach((fx, i) => {
    const last = cards[cards.length - 1];
    if (last && last.slug === fx.eventSlug) last.items.push({ fx, i });
    else cards.push({ slug: fx.eventSlug, name: fx.eventName, items: [{ fx, i }] });
  });
  const card = cards.find((c) => c.slug === f.eventSlug)!;
  const posInCard = card.items.findIndex((it) => it.i === idx) + 1;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* ---- Fight selector + side toggle ---- */}
      <div className="shrink-0 space-y-2 rounded-xl border border-line bg-panel/60 p-2.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => pick(idx - 1)} aria-label="Previous fight"
            className="btn-toggle flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="relative min-w-0 flex-1">
            <select
              value={idx}
              onChange={(e) => pick(Number(e.target.value))}
              aria-label="Choose fight"
              className="w-full appearance-none truncate rounded-md border border-line bg-bg px-3 py-2 pr-9 font-display text-sm font-bold uppercase tracking-wide text-fg outline-none focus:border-steel"
            >
              {cards.map((c) => (
                <optgroup key={c.slug} label={c.name}>
                  {c.items.map(({ fx, i }, k) => (
                    <option key={fx.id} value={i}>
                      {k + 1}. {lastName(fx.a.name)} vs. {lastName(fx.b.name)} · {fx.weightClass}{fx.isTitle ? " · Title" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <button type="button" onClick={() => pick(idx + 1)} aria-label="Next fight"
            className="btn-toggle flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {/* Card line + bout position within that card */}
        <div className="flex items-center justify-between gap-2 px-0.5 text-[10px] uppercase tracking-wider">
          <Link href={`/events/${f.eventSlug}#${f.id}`} className="flex min-w-0 items-center gap-1.5 hover:text-fg">
            <span className="shrink-0 rounded-full border border-line bg-bg/50 px-1.5 py-0.5 font-bold tracking-wider text-muted">Card</span>
            <span className="truncate text-muted">{f.eventName}</span>
          </Link>
          <span className="shrink-0 text-faint">Bout {posInCard} / {card.items.length} · {f.rounds}rd</span>
        </div>

        {/* Side toggle — analyse this fighter's side. */}
        <div className="grid grid-cols-2 gap-2">
          {(["a", "b"] as Side[]).map((s) => {
            const fighter = s === "a" ? f.a : f.b;
            const price = s === "a" ? cur.a : cur.b;
            const on = side === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                aria-pressed={on}
                className={`btn-toggle flex items-center justify-between gap-2 rounded-md px-3 py-2 ${on ? "is-on" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Flag emoji={fighter.flag} country={fighter.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
                  <span className="truncate font-display text-sm font-bold uppercase">{lastName(fighter.name)}</span>
                </span>
                <span className={`tnum shrink-0 text-sm font-bold ${signClass(price)}`}>{fmtOdds(price)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- 2×2 tools, all auto-filled from the selected fight + side ---- */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[repeat(4,1fr)] gap-3 sm:grid-cols-2 sm:grid-rows-2">
        <div className="min-h-0">
          <FeatureGate minPlan="pro" title="Line Movement Tracker" description="Opening → current moneyline drift for the selected bout. A Pro tool.">
            <LineMovementPanel f={f} side={side} live={live} openSource={openSource} curSource={curSource} />
          </FeatureGate>
        </div>
        <div className="min-h-0">
          <FeatureGate minPlan="pro" title="Expected Value (EV) Calculator" description="Vex AI win probability vs the real market price for the selected fighter. A Pro tool.">
            <EVPanel me={me} odds={curOdds} vexProb={vexProb} marketImplied={marketImplied} stake={stake} setStake={setStake} />
          </FeatureGate>
        </div>
        <div className="min-h-0">
          <FeatureGate minPlan="pro" title="Closing Line Value (CLV) Tracker" description="How the opening line compares to the current market for the selected fighter. A Pro tool.">
            <CLVPanel me={me} openOdds={openOdds} curOdds={curOdds} curSource={curSource} />
          </FeatureGate>
        </div>
        <div className="min-h-0">
          <FeatureGate minPlan="pro" title="Bankroll / Kelly Suite" description="Kelly stake from the Vex AI edge at the real market price. A Pro tool.">
            <BankrollPanel me={me} odds={curOdds} vexProb={vexProb} bankroll={bankroll} setBankroll={setBankroll} frac={frac} setFrac={setFrac} />
          </FeatureGate>
        </div>
      </div>
    </div>
  );
}

// ---- shared bits ----
function PanelShell({ title, info, children }: { title: string; info: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="panel flex h-full flex-col overflow-hidden rounded-xl p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold uppercase">{title}</h2>
        {info}
      </div>
      {children}
    </div>
  );
}
function ReadStat({ label, v, tone }: { label: string; v: string; tone?: "edge" | "blood" }) {
  return (
    <div className="rounded-md border border-line bg-panel-2/50 p-2 text-center">
      <p className={`tnum text-base font-bold ${tone === "edge" ? "text-edge" : tone === "blood" ? "text-blood" : "text-fg"}`}>{v}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

// ============================================================
// Line Movement — opening → current (+ live) for the one selected bout.
// ============================================================
function LineMovementPanel({ f, side, live, openSource, curSource }: {
  f: DeskFight; side: Side; live: boolean; openSource: string; curSource: string;
}) {
  const open = f.series[0];
  const cur = f.series[f.series.length - 1];
  const openFairA = noVigProbA(open.a, open.b);
  const curFairA = noVigProbA(cur.a, cur.b);
  const shiftA = (curFairA - openFairA) * 100;
  const favOpen = open.a < open.b ? "a" : "b";
  const favCur = cur.a < cur.b ? "a" : "b";
  const flipped = favOpen !== favCur && Math.abs(shiftA) >= 1;
  const toward = shiftA > 0 ? f.a : f.b;
  const mag = Math.abs(shiftA);

  let badge: { text: string; cls: string };
  if (flipped) badge = { text: `Reverse · flipped to ${lastName(toward.name)}`, cls: "border-amber/40 bg-amber/10 text-amber" };
  else if (mag >= 4) badge = { text: `Steam → ${lastName(toward.name)} +${mag.toFixed(0)}pp`, cls: "border-edge/40 bg-edge/10 text-edge" };
  else if (mag >= 1) badge = { text: `Drift → ${lastName(toward.name)} +${mag.toFixed(0)}pp`, cls: "border-line bg-panel-2/60 text-muted" };
  else badge = { text: "No move", cls: "border-line bg-panel-2/40 text-faint" };

  const vals = f.series.map((s) => noVigProbA(s.a, s.b)); // fighter A implied %
  const row = (s: typeof f.a, sd: Side) => {
    const o = sd === "a" ? open.a : open.b;
    const c = sd === "a" ? cur.a : cur.b;
    return (
      <div className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${side === sd ? "bg-edge/5" : ""}`}>
        <Link href={`/fighters/${s.slug}`} className="flex min-w-0 items-center gap-2 hover:text-blood">
          <Flag emoji={s.flag} country={s.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
          <span className="truncate font-display text-sm font-bold uppercase">{s.name}</span>
        </Link>
        <span className="tnum shrink-0 text-right text-sm">
          <span className="text-faint">{fmtOdds(o)}</span>
          <span className="px-1 text-faint">→</span>
          <span className={`font-bold ${signClass(c)}`}>{fmtOdds(c)}</span>
        </span>
      </div>
    );
  };

  return (
    <PanelShell
      title="Line Movement"
      info={
        <span className="flex items-center gap-2 text-[11px] text-muted">
          {live && <span className="inline-flex items-center gap-1 rounded-full border border-edge/40 bg-edge/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-edge"><span className="h-1.5 w-1.5 rounded-full bg-edge" />Live</span>}
          <InfoButton label="How line movement works">
            This bout&apos;s real <strong className="text-fg">opening line</strong> ({openSource}) → its <strong className="text-fg">current</strong> market price ({curSource}){live ? ", extended by scheduled live snapshots" : ""}. Odds are de-vigged into an implied win probability; the sparkline plots fighter {lastName(f.a.name)}&apos;s implied %. <span className="text-edge">Steam</span> = ≥4pp move, Drift = 1–4pp, <span className="text-amber">Reverse</span> = the favorite flipped. Informational only — not betting advice. 21+.
          </InfoButton>
        </span>
      }
    >
      <div className="mb-2 flex shrink-0 items-center justify-end">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>{badge.text}</span>
      </div>
      <div className="space-y-1">
        {row(f.a, "a")}
        {row(f.b, "b")}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-faint">
          <span className="text-muted">{Math.round(openFairA * 100)}%</span> → <span className="text-fg">{Math.round(curFairA * 100)}%</span> {lastName(f.a.name)} implied
        </div>
        <Spark vals={vals} />
      </div>
    </PanelShell>
  );
}

function Spark({ vals }: { vals: number[] }) {
  const w = 132, h = 30;
  if (vals.length < 2) return null;
  const n = vals.length;
  const x = (i: number) => (i / (n - 1)) * (w - 4) + 2;
  const y = (v: number) => h - 3 - v * (h - 6);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = vals[n - 1] >= vals[0];
  const stroke = up ? "var(--color-edge)" : "var(--color-blood)";
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
      <line x1="2" y1={y(0.5)} x2={w - 2} y2={y(0.5)} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 3" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(vals[n - 1])} r="2.6" fill={stroke} />
    </svg>
  );
}

// ============================================================
// Expected Value — Vex AI win prob vs the real market price.
// Odds & probability are read-only (real data); only stake is yours.
// ============================================================
function EVPanel({ me, odds, vexProb, marketImplied, stake, setStake }: {
  me: { name: string }; odds: number; vexProb: number; marketImplied: number; stake: number; setStake: (n: number) => void;
}) {
  const dec = toDecimal(odds);
  const ev = expectedValue(vexProb, odds);
  const evMoney = ev * stake;
  const edge = vexProb - marketImplied;
  return (
    <PanelShell
      title="Expected Value"
      info={
        <InfoButton label="About expected value">
          At <span className={`tnum ${signClass(odds)}`}>{fmtOdds(odds)}</span> with Vex AI&apos;s {pct(vexProb)} win estimate for {lastName(me.name)}, a {stake}-unit bet has an expected value of{" "}
          <span className={ev >= 0 ? "text-edge" : "text-blood"}>{evMoney >= 0 ? "+" : ""}{evMoney.toFixed(1)} units</span>. The price is the real market line; the probability is the Vex AI simulation — neither is hand-entered. EV is a long-run expectation, not a prediction of this one result. 21+.
        </InfoButton>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <ReadStat label="Market odds" v={fmtOdds(odds)} />
        <ReadStat label="Vex AI win %" v={pct(vexProb)} tone="edge" />
        <label className="block rounded-md border border-line bg-panel-2/50 p-2 text-center">
          <input type="number" value={stake} onChange={(e) => setStake(Number(e.target.value) || 0)}
            className="w-full bg-transparent text-center font-mono text-base font-bold text-fg outline-none" />
          <span className="text-[10px] uppercase tracking-wider text-muted">Stake (units)</span>
        </label>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <ReadStat label="Decimal" v={dec.toFixed(2)} />
        <ReadStat label="Implied %" v={pct(marketImplied)} />
        <ReadStat label="Your edge" v={`${edge >= 0 ? "+" : ""}${pct(edge)}`} tone={edge >= 0 ? "edge" : "blood"} />
      </div>
      <div className={`mt-auto flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 ${ev >= 0 ? "border-edge/30 bg-edge/5" : "border-blood/30 bg-blood/5"}`}>
        <span className="text-[11px] uppercase tracking-wider text-muted">Expected value · {stake}u</span>
        <span className={`tnum text-lg font-bold ${ev >= 0 ? "text-edge" : "text-blood"}`}>{evMoney >= 0 ? "+" : ""}{evMoney.toFixed(1)} units</span>
      </div>
    </PanelShell>
  );
}

// ============================================================
// Closing Line Value — the bout's opening line vs its current market.
// Both prices are real captured lines; nothing is fabricated. (Until the
// fight closes, "current" stands in for the eventual closing line.)
// ============================================================
function CLVPanel({ me, openOdds, curOdds, curSource }: {
  me: { name: string }; openOdds: number; curOdds: number; curSource: string;
}) {
  const openDec = toDecimal(openOdds);
  const curDec = toDecimal(curOdds);
  const clvPct = (openDec / curDec - 1) * 100; // >0 = the opening price beat the current line
  const openImp = impliedProb(openOdds) * 100;
  const curImp = impliedProb(curOdds) * 100;
  const beat = clvPct > 0.05;
  const tone = beat ? "text-edge" : clvPct < -0.05 ? "text-blood" : "text-fg";
  return (
    <PanelShell
      title="Closing Line Value"
      info={
        <InfoButton label="About closing line value">
          Compares {lastName(me.name)}&apos;s real <strong className="text-fg">opening line</strong> with the <strong className="text-fg">current</strong> market ({curSource}).{" "}
          {beat
            ? "The opening price beat the current line — backing it early locked positive value. "
            : clvPct < -0.05
            ? "The market has moved to a better price than the open. "
            : "The line is essentially unchanged. "}
          Both prices are real captured lines; until the bout closes, the current price stands in for the eventual close. Beating the close consistently is the strongest long-run skill signal — not a guaranteed winner. 21+.
        </InfoButton>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <ReadStat label="Opening" v={fmtOdds(openOdds)} />
        <ReadStat label="Current" v={fmtOdds(curOdds)} />
      </div>
      <div className="mt-auto rounded-lg border border-line bg-panel-2/40 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Opening → current value</p>
            <p className={`tnum text-3xl font-bold ${tone}`}>{clvPct >= 0 ? "+" : ""}{clvPct.toFixed(1)}%</p>
          </div>
          <p className="tnum text-right text-xs text-muted">
            Open: {fmtOdds(openOdds)} ({openImp.toFixed(1)}%)<br />Now: {fmtOdds(curOdds)} ({curImp.toFixed(1)}%)
          </p>
        </div>
      </div>
    </PanelShell>
  );
}

// ============================================================
// Bankroll / Kelly — stake from the Vex AI edge at the real market price.
// Odds & probability are read-only; bankroll & Kelly fraction are yours.
// ============================================================
function BankrollPanel({ me, odds, vexProb, bankroll, setBankroll, frac, setFrac }: {
  me: { name: string }; odds: number; vexProb: number; bankroll: number; setBankroll: (n: number) => void; frac: number; setFrac: (n: number) => void;
}) {
  const dec = toDecimal(odds);
  const b = dec - 1;
  const p = Math.min(0.99, Math.max(0.01, vexProb));
  const q = 1 - p;
  const kelly = (b * p - q) / b;
  const edge = (vexProb - impliedProb(odds)) * 100;
  const hasEdge = kelly > 0;
  const rawStakePct = Math.max(0, kelly * frac) * 100;
  const cappedPct = Math.min(rawStakePct, MAX_BET_PCT);
  const capped = rawStakePct > MAX_BET_PCT;
  const stake = (cappedPct / 100) * bankroll;
  const unit = bankroll * 0.01;
  const toWin = stake * b;

  return (
    <PanelShell
      title="Bankroll / Kelly"
      info={
        <div className="flex items-center gap-2">
          {FRACTIONS.map((fr) => (
            <button key={fr.k} type="button" onClick={() => setFrac(fr.v)}
              className={`btn-toggle rounded-md px-2.5 py-1 text-xs font-semibold ${frac === fr.v ? "is-on" : ""}`}>
              {fr.k}
            </button>
          ))}
          <InfoButton label="About bankroll sizing">
            Fractional-Kelly stake from Vex AI&apos;s {pct(vexProb)} estimate for {lastName(me.name)} at the real {fmtOdds(odds)} line, with a {MAX_BET_PCT}% single-bet guardrail.
            {hasEdge
              ? ` Edge vs price ${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%, full-Kelly ${(kelly * 100).toFixed(1)}%; to win $${toWin.toFixed(0)}.${capped ? ` Capped at the ${MAX_BET_PCT}% guardrail.` : ""}`
              : ` No positive edge — the Vex AI estimate is below the ${(impliedProb(odds) * 100).toFixed(1)}% the price implies, so Kelly says pass.`}
            {" "}Informational only — FightVex does not accept wagers. Never bet money you can&apos;t afford to lose. 21+.
          </InfoButton>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <label className="block rounded-md border border-line bg-panel-2/50 p-2 text-center">
          <span className="tnum flex items-center justify-center text-base font-bold text-fg">
            <span className="text-faint">$</span>
            <input type="number" value={bankroll} onChange={(e) => setBankroll(Number(e.target.value) || 0)}
              className="w-full bg-transparent text-center font-mono outline-none" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted">Bankroll</span>
        </label>
        <ReadStat label="Vex AI win %" v={pct(vexProb)} tone="edge" />
        <ReadStat label="Market odds" v={fmtOdds(odds)} />
      </div>
      <div className="mt-auto rounded-lg border border-line bg-panel-2/40 p-4">
        {hasEdge ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`tnum text-2xl font-bold ${capped ? "text-amber" : "text-edge"}`}>${stake.toFixed(0)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">Suggested stake</p>
            </div>
            <div>
              <p className="tnum text-2xl font-bold text-fg">{cappedPct.toFixed(1)}%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">of bankroll</p>
            </div>
            <div>
              <p className="tnum text-2xl font-bold text-fg">${unit.toFixed(0)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">1 unit (flat)</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No positive edge at this price — Kelly says <span className="font-semibold text-fg">stake $0 / pass</span>. Details in ⓘ.
          </p>
        )}
      </div>
    </PanelShell>
  );
}
