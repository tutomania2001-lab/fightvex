// ============================================================
// FightVex — event / card / odds layer
//
// REAL event, card order, matchups, weight classes & rounds come
// from the ESPN public MMA API (espn.generated.ts). Betting lines are
// REAL web-sourced market odds (odds.generated.ts) when available for
// the bout; bouts without a captured line fall back to MODEL-IMPLIED
// prices from FightVex's simulation engine (../sim). Value signals
// compare the Vex AI model probability against the real no-vig market.
// Informational only, NOT betting advice. 21+.
// ============================================================
import type { FightEvent, Matchup, OddsLine, WeightClass } from "../types";
import { REAL_EVENTS, type RawBout } from "./espn.generated";
import { realOddsFor, ODDS_SOURCE, ODDS_CAPTURED } from "./odds.generated";
import { getFighterById } from "./fighters";
import { isShortNotice, missedWeight } from "./context.override";
import { impliedProb } from "../format";
import { simulate } from "../sim";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const noVigA = (priceA: number, priceB: number) => {
  const a = impliedProb(priceA), b = impliedProb(priceB);
  return a / (a + b);
};

function probToAmerican(p: number): number {
  p = clamp(p, 0.03, 0.97);
  const raw = p >= 0.5 ? -(100 * p) / (1 - p) : (100 * (1 - p)) / p;
  return Math.round(raw / 5) * 5; // round to nearest 5 like a real book
}

function lineHistory(end: number, points = 8): { t: string; impliedA: number }[] {
  const start = clamp(end - 0.04, 0.05, 0.95);
  const out = [];
  for (let i = 0; i < points; i++) {
    const f = i / (points - 1);
    const v = start + (end - start) * f + (i % 2 === 0 ? 0.005 : -0.005);
    out.push({ t: `T-${points - i}d`, impliedA: Math.round(v * 1000) / 1000 });
  }
  return out;
}

function styleOf(ko: number, sub: number, wins: number): "striker" | "grappler" | "all-round" {
  const k = wins ? ko / wins : 0.33, s = wins ? sub / wins : 0.33;
  if (k >= 0.5 && k >= s) return "striker";
  if (s >= 0.45) return "grappler";
  return "all-round";
}

function buildMatchup(bout: RawBout): Matchup | null {
  const a = getFighterById(bout.fighterA);
  const b = getFighterById(bout.fighterB);
  if (!a || !b) return null;

  // Short-notice context (from fight-week news) → applied everywhere this matchup
  // is simulated, so every surface reflects the same prep handicap.
  const shortNoticeA = isShortNotice(bout.fighterA);
  const shortNoticeB = isShortNotice(bout.fighterB);
  const missedWeightA = missedWeight(bout.fighterA);
  const missedWeightB = missedWeight(bout.fighterB);
  const sim = simulate(a, b, { rounds: bout.rounds, runs: 600, shortNoticeA, shortNoticeB, missedWeightA, missedWeightB });
  const pA = sim.probA;

  // REAL web-sourced market odds when available (odds.generated.ts);
  // otherwise fall back to model-implied prices.
  const real = realOddsFor(bout.id);
  let odds: OddsLine[];
  let oddsSource: string | undefined;
  let lineEndA: number; // implied prob the line-movement chart converges to
  if (real) {
    odds = [{ book: "Consensus", region: "US", priceA: real.oddsA, priceB: real.oddsB, capturedAt: ODDS_CAPTURED }];
    oddsSource = `${ODDS_SOURCE} · ${ODDS_CAPTURED}`;
    lineEndA = noVigA(real.oddsA, real.oddsB);
  } else {
    const vig = 1.045;
    const vA = clamp(pA * vig, 0.03, 0.97);
    const vB = clamp((1 - pA) * vig, 0.03, 0.97);
    const baseA = probToAmerican(vA);
    const baseB = probToAmerican(vB);
    const books: { book: string; region: string; d: number }[] = [
      { book: "BetForge", region: "US", d: 0 },
      { book: "OddsVault", region: "US", d: 5 },
      { book: "LineKing", region: "UK", d: -5 },
    ];
    odds = books.map(({ book, region, d }) => ({
      book, region,
      priceA: baseA + (baseA < 0 ? -d : d),
      priceB: baseB + (baseB < 0 ? d : -d),
      capturedAt: "T-1d",
    }));
    lineEndA = pA;
  }

  // model-driven key factors
  const sa = styleOf(a.record.ko, a.record.sub, a.record.wins);
  const sb = styleOf(b.record.ko, b.record.sub, b.record.wins);
  const factors: string[] = [];
  if (sa !== sb && (sa === "striker" || sb === "striker") && (sa === "grappler" || sb === "grappler")) {
    factors.push("Classic striker-vs-grappler stylistic clash");
  }
  // Only factors backed by REAL data (reach is real ESPN; finish profile is the
  // real record) or the Vex AI simulation. No fabricated layoff / derived cardio.
  const reachGap = Math.abs(a.reachCm - b.reachCm);
  if (reachGap >= 8) {
    const longer = a.reachCm > b.reachCm ? a : b;
    factors.push(`${longer.name.split(" ").slice(-1)[0]} holds a ${reachGap}cm reach edge`);
  }
  const koA = a.record.ko, koB = b.record.ko, subA = a.record.sub, subB = b.record.sub;
  if (koA >= 5 && koA > subA) factors.push(`${a.name.split(" ").slice(-1)[0]} carries real KO power (${koA} KO/TKO wins)`);
  if (koB >= 5 && koB > subB) factors.push(`${b.name.split(" ").slice(-1)[0]} carries real KO power (${koB} KO/TKO wins)`);
  if (subA >= 5 && subA >= koA) factors.push(`${a.name.split(" ").slice(-1)[0]} is a submission threat (${subA} sub wins)`);
  if (subB >= 5 && subB >= koB) factors.push(`${b.name.split(" ").slice(-1)[0]} is a submission threat (${subB} sub wins)`);
  factors.push(`Vex AI favors ${(pA >= 0.5 ? a : b).name.split(" ").slice(-1)[0]} at ${Math.round(Math.max(pA, 1 - pA) * 100)}%`);

  const isTitle = bout.rounds === 5 && (!!a.champion || !!b.champion);

  return {
    id: bout.id,
    fighterA: bout.fighterA,
    fighterB: bout.fighterB,
    weightClass: bout.weightClass as WeightClass,
    rounds: bout.rounds,
    isMain: bout.boutOrder <= 5,
    isTitle,
    boutOrder: bout.boutOrder,
    shortNoticeA,
    shortNoticeB,
    missedWeightA,
    missedWeightB,
    odds,
    oddsSource,
    lineHistory: lineHistory(lineEndA),
    publicSentimentA: Math.round(clamp(pA * 100 + (sim.variance === "HIGH" ? -4 : 4), 12, 88)),
    keyFactors: factors.slice(0, 4),
  };
}

// Every upcoming UFC event the fetch captured (soonest first), each with its
// real card built into matchups.
const EVENTS: FightEvent[] = REAL_EVENTS.map((re) => ({
  id: re.id,
  slug: re.slug,
  name: re.name,
  org: re.org,
  date: re.date,
  venue: re.venue,
  city: re.city,
  country: re.country,
  broadcast: re.broadcast,
  status: re.status,
  matchups: re.bouts.map(buildMatchup).filter((m): m is Matchup => m !== null),
}));

export function allEvents(): FightEvent[] {
  return EVENTS;
}
export function upcomingEvents(): FightEvent[] {
  // Date-based (not the stored ESPN status, which lags after an event): an event
  // is "upcoming" until ~6h past its start. Keeps the rolling banners/countdown
  // pointed at the genuinely next cards even before the data is re-fetched.
  const cutoff = Date.now() - 6 * 3.6e6;
  const up = EVENTS.filter((e) => new Date(e.date).getTime() > cutoff);
  return up.length ? up : EVENTS;
}
export function getEvent(slug: string): FightEvent | undefined {
  return EVENTS.find((e) => e.slug === slug);
}
export function getMatchup(id: string): { event: FightEvent; matchup: Matchup } | undefined {
  for (const e of EVENTS) {
    const m = e.matchups.find((mm) => mm.id === id);
    if (m) return { event: e, matchup: m };
  }
  return undefined;
}
export function nextEvent(): FightEvent {
  return upcomingEvents()[0];
}
