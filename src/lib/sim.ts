// ============================================================
// FightVector — AI Fight Simulation Engine
//
// Transparent, seeded probabilistic model:
// weighted category sub-scores → composite rating → logistic
// win probability → Monte Carlo for method/round distributions,
// with uncertainty inflation to prevent overconfidence.
// Every weight is published. NOT betting advice.
// ============================================================
import type { Fighter } from "./types";

export interface SimParams {
  rounds: 3 | 5;
  shortNoticeA?: boolean;
  shortNoticeB?: boolean;
  runs?: number;
}
export interface FactorContribution {
  label: string;
  delta: number;
  dimension: string;
}
export interface MethodDist {
  ko: number;
  sub: number;
  dec: number;
}
export interface SimResult {
  probA: number;
  probB: number;
  ciLow: number;
  ciHigh: number;
  methodA: MethodDist;
  methodB: MethodDist;
  roundMomentum: number[];
  factors: FactorContribution[];
  dataCompleteness: number;
  variance: "LOW" | "MEDIUM" | "HIGH";
  runs: number;
  ratingA: number;
  ratingB: number;
  subscoresA: Record<string, number>;
  subscoresB: Record<string, number>;
}

// ---- Published category weights (sum = 1.0) ----
export const WEIGHTS: Record<string, number> = {
  Striking: 0.22,
  Wrestling: 0.15,
  Grappling: 0.12,
  Cardio: 0.12,
  Durability: 0.1,
  Form: 0.1,
  Competition: 0.08,
  Submission: 0.06,
  Physical: 0.05,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const norm = (v: number, lo: number, hi: number) => clamp((v - lo) / (hi - lo), 0, 1) * 100;

function makeRng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(...ids: (string | number)[]): number {
  const s = ids.join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function subscores(f: Fighter): Record<string, number> {
  const s = f.stats;
  const striking =
    0.32 * norm(s.slpm, 1.5, 7) + 0.22 * s.strAcc + 0.26 * s.strDef + 0.2 * norm(s.kdAvg, 0, 2.2);
  const wrestling = 0.4 * norm(s.tdAvg, 0, 6) + 0.3 * s.tdAcc + 0.3 * s.tdDef;
  const grappling = 0.45 * norm(s.ctrl, 0, 4) + 0.3 * s.tdDef + 0.25 * norm(s.subAvg, 0, 3);
  const submission = 0.6 * norm(s.subAvg, 0, 3) + 0.4 * s.finishRate;
  const cardio = s.cardio;
  const durability = 0.7 * s.durability + 0.3 * s.strDef;
  const ageScore = 100 - Math.abs(f.age - 29) * 6;
  const physical = 0.55 * norm(f.reachCm, 165, 215) + 0.45 * clamp(ageScore, 0, 100);

  const recent = f.form.slice(0, 5);
  let formScore = 50;
  if (recent.length) {
    const wQ = recent.map((_, i) => Math.pow(0.78, i));
    const wSum = wQ.reduce((a, b) => a + b, 0);
    formScore = recent.reduce((acc, e, i) => acc + (e.rating * wQ[i]) / wSum, 0);
  }
  const competition = f.oppQuality;

  return {
    Striking: clamp(striking, 0, 100),
    Wrestling: clamp(wrestling, 0, 100),
    Grappling: clamp(grappling, 0, 100),
    Submission: clamp(submission, 0, 100),
    Cardio: clamp(cardio, 0, 100),
    Durability: clamp(durability, 0, 100),
    Physical: clamp(physical, 0, 100),
    Form: clamp(formScore, 0, 100),
    Competition: clamp(competition, 0, 100),
  };
}

function composite(sub: Record<string, number>): number {
  return Object.keys(WEIGHTS).reduce((acc, k) => acc + WEIGHTS[k] * sub[k], 0);
}

function dataCompleteness(f: Fighter): number {
  const s = f.stats;
  const vals = [s.slpm, s.strAcc, s.sapm, s.strDef, s.tdAvg, s.tdAcc, s.tdDef, s.subAvg, s.ctrl, s.kdAvg, s.cardio, s.durability, s.finishRate];
  const present = vals.filter((v) => v !== undefined && v !== null && !Number.isNaN(v)).length;
  return present / vals.length;
}

export function simulate(a: Fighter, b: Fighter, params: SimParams): SimResult {
  const runs = params.runs ?? 1000;
  const subA = subscores(a);
  const subB = subscores(b);
  let rA = composite(subA);
  let rB = composite(subB);

  const layoffPen = (m: number) => -Math.max(0, m - 9) * 0.35;
  rA += layoffPen(a.layoffMonths);
  rB += layoffPen(b.layoffMonths);
  if (params.shortNoticeA) rA -= 4;
  if (params.shortNoticeB) rB -= 4;

  const completeness = Math.min(dataCompleteness(a), dataCompleteness(b));
  const k = 0.085;
  let probA = 1 / (1 + Math.exp(-k * (rA - rB)));

  const chaos = (a.stats.kdAvg + b.stats.kdAvg) / 2 + (a.stats.finishRate + b.stats.finishRate) / 200;
  const variance: SimResult["variance"] = chaos > 1.7 ? "HIGH" : chaos > 1.0 ? "MEDIUM" : "LOW";

  const shrink = (1 - completeness) * 0.35 + (variance === "HIGH" ? 0.12 : variance === "MEDIUM" ? 0.06 : 0);
  probA = 0.5 + (probA - 0.5) * (1 - shrink);
  probA = clamp(probA, 0.08, 0.92);

  const seed = seedFrom(a.id, b.id, params.rounds, params.runs ?? 0, params.shortNoticeA ? 1 : 0, params.shortNoticeB ? 1 : 0);
  const rng = makeRng(seed);
  const sigma = 9 + (1 - completeness) * 8 + (variance === "HIGH" ? 6 : variance === "MEDIUM" ? 3 : 0);

  let winsA = 0;
  const mA = { ko: 0, sub: 0, dec: 0 };
  const mB = { ko: 0, sub: 0, dec: 0 };
  const winProbSamples: number[] = [];
  const momentum = new Array(params.rounds).fill(0);

  for (let i = 0; i < runs; i++) {
    const nA = rA + gauss(rng) * sigma;
    const nB = rB + gauss(rng) * sigma;
    const pA = 1 / (1 + Math.exp(-k * (nA - nB)));
    winProbSamples.push(pA);

    let finished = false;
    for (let r = 0; r < params.rounds; r++) {
      const roundWinnerA = rng() < pA;
      momentum[r] += roundWinnerA ? 1 : -1;
      const fin = roundWinnerA ? finishHazard(a, b) : finishHazard(b, a);
      if (rng() < fin) {
        finished = true;
        const koShare = roundWinnerA ? koVsSub(a, b) : koVsSub(b, a);
        const isKo = rng() < koShare;
        if (roundWinnerA) {
          winsA++;
          if (isKo) mA.ko++; else mA.sub++;
        } else {
          if (isKo) mB.ko++; else mB.sub++;
        }
        break;
      }
    }
    if (!finished) {
      const decA = rng() < pA;
      if (decA) { winsA++; mA.dec++; } else { mB.dec++; }
    }
  }

  const mcProbA = winsA / runs;
  const finalProbA = clamp(0.5 * probA + 0.5 * mcProbA, 0.08, 0.92);

  winProbSamples.sort((x, y) => x - y);
  const ciLow = clamp(percentile(winProbSamples, 0.1), 0.05, 0.95);
  const ciHigh = clamp(percentile(winProbSamples, 0.9), 0.05, 0.95);

  const totalAll = mA.ko + mA.sub + mA.dec + mB.ko + mB.sub + mB.dec || 1;
  const methodA: MethodDist = { ko: mA.ko / totalAll, sub: mA.sub / totalAll, dec: mA.dec / totalAll };
  const methodB: MethodDist = { ko: mB.ko / totalAll, sub: mB.sub / totalAll, dec: mB.dec / totalAll };

  const slope = k * finalProbA * (1 - finalProbA);
  const factors: FactorContribution[] = Object.keys(WEIGHTS)
    .map((key) => ({ label: key, delta: WEIGHTS[key] * (subA[key] - subB[key]) * slope * 100, dimension: key }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  if (a.layoffMonths > 9 || b.layoffMonths > 9) {
    const d = (layoffPen(a.layoffMonths) - layoffPen(b.layoffMonths)) * slope * 100;
    if (Math.abs(d) > 0.3) factors.push({ label: "Layoff / ring rust", delta: d, dimension: "Preparation" });
  }
  if (params.shortNoticeA || params.shortNoticeB) {
    const d = ((params.shortNoticeA ? -4 : 0) - (params.shortNoticeB ? -4 : 0)) * slope * 100;
    factors.push({ label: "Short-notice", delta: d, dimension: "Preparation" });
  }

  return {
    probA: finalProbA,
    probB: 1 - finalProbA,
    ciLow,
    ciHigh,
    methodA,
    methodB,
    roundMomentum: momentum.map((m) => m / runs),
    factors: factors.slice(0, 6),
    dataCompleteness: completeness,
    variance,
    runs,
    ratingA: rA,
    ratingB: rB,
    subscoresA: subA,
    subscoresB: subB,
  };
}

function finishHazard(winner: Fighter, loser: Fighter): number {
  const fin = winner.stats.finishRate / 100;
  const dur = loser.stats.durability / 100;
  const power = (winner.stats.kdAvg / 2 + winner.stats.subAvg / 3) / 2;
  return clamp(0.06 + fin * 0.18 * (1 - dur) + power * 0.05, 0.02, 0.4);
}
function koVsSub(winner: Fighter, loser: Fighter): number {
  const koPull = winner.stats.kdAvg * 1.2 + winner.stats.slpm * 0.1;
  const subPull = winner.stats.subAvg * 1.4 + winner.stats.ctrl * 0.2;
  return clamp(koPull / (koPull + subPull + 0.001), 0.1, 0.92);
}
function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0.5;
  const idx = clamp(Math.floor(p * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}
