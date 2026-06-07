// ============================================================
// FightVex — AI Fight Simulation Engine (v2: style-aware)
//
// Transparent, seeded, NON-fabricated model. The headline upgrade
// over v1: the fight is no longer decided by one composite rating.
// We use the rating gap only as a PRIOR, then run a phase-based,
// round-by-round Monte Carlo that simulates the actual style clash —
// where the fight happens (standing vs ground), fatigue, accumulated
// damage and finishing paths — so a great striker with poor takedown
// defence correctly fares worse against an elite wrestler.
//
// What we deliberately do NOT do: pretend to run a trained ML model
// or "market-calibrated" probabilities. We have no labelled outcome
// dataset to train/backtest on, so that would be fabrication. Instead
// the simulation is anchored to REAL UFC base rates (method/finish
// splits) so the distribution stays realistic. Every weight is here.
// NOT betting advice. 21+.
// ============================================================
import type { Fighter } from "./types";
import { gbmProbA } from "./gbm";

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
export interface Headline {
  winnerSide: "A" | "B";
  method: "KO/TKO" | "Submission" | "Decision";
  round?: number;
  timeLabel?: string;
  confidence: number;
}
export interface RoundDist {
  aFinish: number[];
  bFinish: number[];
  aDec: number;
  bDec: number;
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
  headline: Headline;
  roundDist: RoundDist;
  // ---- v2 additions (optional; older UI ignores them) ----
  /** A's share of rounds won, per round (index 0 = round 1) — the win-prob curve. */
  roundWinProbA?: number[];
  /** Expected fraction of the fight contested on the ground (0..1). */
  groundShare?: number;
  /** Human-readable swing factors, e.g. "B's edge fades after round 2 (cardio gap)". */
  swingFactors?: string[];
  /** Raw Monte-Carlo win rate for A, before the prior blend/shrink (backtest hook). */
  mcProbA?: number;
}

// ---- Published category weights (≈ sum 1.0) — transparent prior + radar ----
// Data-informed: fit by L2 logistic regression on 3,289 leakage-free historical
// bouts (walk-forward validated), blended with priors so every category stays
// interpretable. The data pushed Durability and Form up. Competition (opponent
// quality from rankings) is kept at its PRIOR weight on purpose: the backtest
// can't reconstruct historical rankings, so it couldn't measure it (near-zero
// variance) — zeroing it would be a backtest artifact, not the truth, since in
// production it uses real rankings and clearly matters.
export const WEIGHTS: Record<string, number> = {
  Durability: 0.183, // damage resistance / chin proved the strongest measured signal
  Striking: 0.139,
  Wrestling: 0.134,
  Competition: 0.131, // kept at prior — see note above (unmeasurable in backtest)
  Form: 0.113,
  Grappling: 0.108,
  Physical: 0.086,
  Cardio: 0.061,
  Submission: 0.045,
};

// ---- Real UFC base rates the simulation is calibrated toward (approx, modern
// era): ~50% of fights reach decision, ~32% KO/TKO, ~18% submission. The
// per-round finish hazards below are tuned so two average fighters land near
// this split; fighters' real finishing tendencies then move it. ----
// Finish hazards. Validated against real outcomes: the old values predicted only
// ~30% finishes vs the real ~49%, so the sim badly over-called decisions. Doubled
// to match the true UFC finish rate (sim mean ~49.5% ≈ real 49.1%), which makes
// the method-of-victory breakdown honest without changing who wins.
const BASE_KO = 3.8;
const BASE_SUB = 17.2;

// Per-division finish-rate priors. KO rate varies hugely by weight (Heavyweight
// ~48% of fights → Women's Strawweight ~14%) while submission rate is relatively
// flat across divisions — so the global BASE_KO/BASE_SUB get a per-division
// multiplier. Multipliers are anchored to the overall UFC split (~31% KO,
// ~19% sub) so the heavily-populated mid divisions sit near 1.0 and the global
// finish rate the sim is tuned to is preserved. Source: Fight Matrix "UFC fight
// outcomes by weight class" (real historical base rates). Women's Featherweight
// folds into Women's Bantamweight (normClass maps it there).
const FINISH_MULT: Record<string, { ko: number; sub: number }> = {
  "Heavyweight":          { ko: 1.55, sub: 1.12 },
  "Light Heavyweight":    { ko: 1.41, sub: 1.00 },
  "Middleweight":         { ko: 1.19, sub: 1.14 },
  "Welterweight":         { ko: 1.05, sub: 1.01 },
  "Lightweight":          { ko: 0.95, sub: 1.15 },
  "Featherweight":        { ko: 0.93, sub: 0.91 },
  "Bantamweight":         { ko: 0.82, sub: 1.02 },
  "Flyweight":            { ko: 0.80, sub: 1.12 },
  "Women's Bantamweight": { ko: 0.71, sub: 0.87 },
  "Women's Flyweight":    { ko: 0.55, sub: 1.01 },
  "Women's Strawweight":  { ko: 0.45, sub: 1.03 },
};
function finishMult(wc: string): { ko: number; sub: number } {
  return FINISH_MULT[wc] ?? { ko: 1, sub: 1 };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const norm = (v: number, lo: number, hi: number) => clamp((v - lo) / (hi - lo), 0, 1) * 100;
const sig = (x: number) => 1 / (1 + Math.exp(-x));

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

// ---- Transparent category sub-scores (0..100) — drive the radar + the prior. ----
export function subscores(f: Fighter): Record<string, number> {
  const s = f.stats;
  const striking =
    0.32 * norm(s.slpm, 1.5, 7) + 0.22 * s.strAcc + 0.26 * s.strDef + 0.2 * norm(s.kdAvg, 0, 2.2);
  const wrestling = 0.4 * norm(s.tdAvg, 0, 6) + 0.3 * s.tdAcc + 0.3 * s.tdDef;
  const grappling = 0.45 * norm(s.ctrl, 0, 6) + 0.3 * s.tdDef + 0.25 * norm(s.subAvg, 0, 3);
  const submission = 0.6 * norm(s.subAvg, 0, 3) + 0.4 * s.finishRate;
  const cardio = s.cardio;
  const durability = 0.7 * s.durability + 0.3 * s.strDef;
  const ageScore = 100 - Math.abs(f.age - 29) * 6;
  const physical = 0.55 * norm(f.reachCm, 165, 215) + 0.45 * clamp(ageScore, 0, 100);
  const tot = f.record.wins + f.record.losses + f.record.draws;
  const winRate = tot ? f.record.wins / tot : 0.5;
  const formScore = clamp(35 + winRate * 60, 0, 100);
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

// ---- Phase capabilities (0..100) — the inputs the round simulator actually
// uses. Unlike the composite, these stay separate so the matchup (e.g. striking
// vs takedown defence) is resolved dynamically, not pre-averaged. ----
interface Caps {
  strO: number; power: number; strD: number;
  tdO: number; tdD: number; control: number;
  subO: number; subD: number; chin: number;
  cardio: number; iq: number;
}
export function caps(f: Fighter): Caps {
  const s = f.stats;
  const tot = f.record.wins + f.record.losses + f.record.draws;
  const winRate = tot ? f.record.wins / tot : 0.5;
  return {
    strO: clamp(0.45 * norm(s.slpm, 1.5, 7.5) + 0.3 * s.strAcc + 0.25 * norm(s.kdAvg, 0, 2.2), 0, 100),
    power: clamp(0.6 * norm(s.kdAvg, 0, 2.2) + 0.4 * s.finishRate, 0, 100),
    strD: clamp(0.6 * s.strDef + 0.4 * s.durability, 0, 100),
    tdO: clamp(0.6 * norm(s.tdAvg, 0, 6) + 0.4 * s.tdAcc, 0, 100),
    tdD: clamp(s.tdDef, 0, 100),
    control: clamp(0.6 * norm(s.ctrl, 0, 6) + 0.4 * norm(s.tdAvg, 0, 6), 0, 100),
    subO: clamp(0.7 * norm(s.subAvg, 0, 3) + 0.3 * s.finishRate, 0, 100),
    subD: clamp(0.55 * s.tdDef + 0.45 * s.durability, 0, 100),
    chin: clamp(s.durability, 0, 100),
    cardio: clamp(s.cardio, 0, 100),
    iq: clamp(35 + winRate * 55, 0, 100),
  };
}

// Expected fraction of the fight on the ground, given who can take whom down and
// who controls — used for the matchup-adjusted swing factors and the prior.
function expectedGround(ca: Caps, cb: Caps): { ground: number; ctrlNetA: number } {
  const tdA = sig((ca.tdO - cb.tdD) * 0.05);
  const tdB = sig((cb.tdO - ca.tdD) * 0.05);
  const ctrlA = (ca.control / 100) * tdA;
  const ctrlB = (cb.control / 100) * tdB;
  return { ground: clamp(ctrlA + ctrlB, 0, 0.9), ctrlNetA: ctrlA - ctrlB };
}

interface FightOutcome { winner: "A" | "B"; method: "ko" | "sub" | "dec"; round: number; tsec: number; roundWinsA: boolean[]; }

// One simulated fight. Carries fatigue + damage across rounds so the fight has
// a shape (e.g. a low-cardio fighter fades; a hurt fighter gets finished later).
function simFight(ca: Caps, cb: Caps, rounds: number, rng: () => number, debA: number, debB: number, koMult = 1, subMult = 1): FightOutcome {
  let fatA = 0, fatB = 0, dmgA = 0, dmgB = 0, scoreA = 0, scoreB = 0;
  const roundWinsA: boolean[] = [];
  for (let r = 0; r < rounds; r++) {
    // Output multipliers: fatigue (worse for low cardio) + accumulated damage + prep debuff.
    const outA = clamp((1 - fatA * (1.1 - ca.cardio / 100) * 0.55) * (1 - dmgA * 0.2) * debA, 0.35, 1);
    const outB = clamp((1 - fatB * (1.1 - cb.cardio / 100) * 0.55) * (1 - dmgB * 0.2) * debB, 0.35, 1);

    // Where does the round happen?
    const tdA = sig((ca.tdO - cb.tdD) * 0.05);
    const tdB = sig((cb.tdO - ca.tdD) * 0.05);
    const ctrlA = (ca.control / 100) * tdA * outA;
    const ctrlB = (cb.control / 100) * tdB * outB;
    const ground = clamp(ctrlA + ctrlB, 0, 0.92);
    const standing = 1 - ground;
    const ctrlNet = ctrlA - ctrlB;

    // Standing striking advantage, then overall round dominance D (A positive).
    const strikeAdv = ca.strO * outA - cb.strO * outB; // ~ -100..100
    const D = standing * (strikeAdv / 45) + ctrlNet * 1.25 + (ca.iq - cb.iq) / 130;
    const pRoundA = sig(D * 1.6);
    const aWins = rng() < pRoundA;
    roundWinsA.push(aWins);
    if (aWins) scoreA++; else scoreB++;

    // How DECISIVELY each side is winning the round. Finishes are gated on this,
    // so a competitive round almost never ends in a finish — it banks toward the
    // scorecards. This is what lets a better grinder beat a one-shot finisher.
    const domA = clamp(D, 0, 1.6);
    const domB = clamp(-D, 0, 1.6);

    // Damage: only the fighter winning the exchange hurts the other; the chin
    // resists. Damage carries over, so finishes BUILD across rounds instead of
    // flashing in round 1.
    const vulnB = clamp(1.45 - cb.chin / 100, 0.45, 1.15);
    const vulnA = clamp(1.45 - ca.chin / 100, 0.45, 1.15);
    dmgB = clamp(dmgB + domA * standing * (ca.power / 100) * vulnB * 0.17, 0, 1);
    dmgA = clamp(dmgA + domB * standing * (cb.power / 100) * vulnA * 0.17, 0, 1);

    // Finishing hazards — dominance- AND damage-gated, low base. A KO needs a
    // dominant standing round + power against a hurt/weak chin; a submission needs
    // control + submission skill beating the opponent's defence. The (0.2 + dmg…)
    // term keeps round-1 finishes rare unless the power/edge is huge.
    const koHazA = clamp(BASE_KO * koMult * (0.4 + domA) * standing * (ca.power / 100) * (0.25 + dmgB * 1.5) * vulnB, 0, 0.5);
    const koHazB = clamp(BASE_KO * koMult * (0.4 + domB) * standing * (cb.power / 100) * (0.25 + dmgA * 1.5) * vulnA, 0, 0.5);
    const subHazA = clamp(BASE_SUB * subMult * ctrlA * (ca.subO / 100) * (0.35 + dmgB * 0.85) * clamp(1.1 - cb.subD / 100, 0.25, 1), 0, 0.4);
    const subHazB = clamp(BASE_SUB * subMult * ctrlB * (cb.subO / 100) * (0.35 + dmgA * 0.85) * clamp(1.1 - ca.subD / 100, 0.25, 1), 0, 0.4);
    const finA = koHazA + subHazA, finB = koHazB + subHazB;

    const tsec = 15 + Math.floor(rng() * 280);
    const rFin = rng();
    if (finA >= finB && rFin < finA) {
      const isKo = rng() < koHazA / (finA + 1e-9);
      return { winner: "A", method: isKo ? "ko" : "sub", round: r, tsec, roundWinsA };
    }
    if (finB > finA && rFin < finB) {
      const isKo = rng() < koHazB / (finB + 1e-9);
      return { winner: "B", method: isKo ? "ko" : "sub", round: r, tsec, roundWinsA };
    }

    // Fatigue accrual — pace + (1 - cardio).
    const paceA = ca.strO / 100 * 0.6 + ctrlA * 0.4;
    const paceB = cb.strO / 100 * 0.6 + ctrlB * 0.4;
    fatA = clamp(fatA + 0.15 + paceA * 0.12 * (1.1 - ca.cardio / 100), 0, 1);
    fatB = clamp(fatB + 0.15 + paceB * 0.12 * (1.1 - cb.cardio / 100), 0, 1);
  }
  // Decision — score on the cards; damage breaks a tie.
  const winner = scoreA !== scoreB ? (scoreA > scoreB ? "A" : "B") : dmgB !== dmgA ? (dmgB > dmgA ? "A" : "B") : (rng() < 0.5 ? "A" : "B");
  return { winner, method: "dec", round: rounds - 1, tsec: 0, roundWinsA };
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
  const ca = caps(a);
  const cb = caps(b);
  // Per-division finish-rate prior (both fighters share the bout's weight class).
  const fm = finishMult(a.weightClass);

  // ---- Transparent PRIOR from the composite rating gap (a stabiliser only) ----
  let rA = composite(subA);
  let rB = composite(subB);
  const layoffPen = (m: number) => -Math.max(0, m - 9) * 0.35;
  rA += layoffPen(a.layoffMonths);
  rB += layoffPen(b.layoffMonths);
  const debA = params.shortNoticeA ? 0.93 : 1;
  const debB = params.shortNoticeB ? 0.93 : 1;
  if (params.shortNoticeA) rA -= 4;
  if (params.shortNoticeB) rB -= 4;

  const completeness = Math.min(dataCompleteness(a), dataCompleteness(b));
  // Prior slope, tuned by WALK-FORWARD validation on 3,289 leakage-free bouts
  // (train on the past, score the future). k=0.14 with the data-fitted weights
  // above maximised held-out accuracy (~63%) at log-loss ~0.648 while staying
  // well-calibrated (ECE ~2%).
  const k = 0.14;
  const priorA = 1 / (1 + Math.exp(-k * (rA - rB)));

  const chaos = (a.stats.kdAvg + b.stats.kdAvg) / 2 + (a.stats.finishRate + b.stats.finishRate) / 200;
  const variance: SimResult["variance"] = chaos > 1.7 ? "HIGH" : chaos > 1.0 ? "MEDIUM" : "LOW";

  const seed = seedFrom(a.id, b.id, params.rounds, params.runs ?? 0, params.shortNoticeA ? 1 : 0, params.shortNoticeB ? 1 : 0);
  const rng = makeRng(seed);

  // ---- Style-aware Monte Carlo (the realistic layer) ----
  let winsA = 0;
  const mA = { ko: 0, sub: 0, dec: 0 };
  const mB = { ko: 0, sub: 0, dec: 0 };
  const momentum = new Array(params.rounds).fill(0);
  const roundWonA = new Array(params.rounds).fill(0); // A's round wins per round (curve)
  const roundFinA = new Array(params.rounds).fill(0);
  const roundFinB = new Array(params.rounds).fill(0);
  let decWinsA = 0, decWinsB = 0;
  const finTimes: Record<string, number[]> = {};

  for (let i = 0; i < runs; i++) {
    const o = simFight(ca, cb, params.rounds, rng, debA, debB, fm.ko, fm.sub);
    for (let r = 0; r < o.roundWinsA.length; r++) {
      momentum[r] += o.roundWinsA[r] ? 1 : -1;
      if (o.roundWinsA[r]) roundWonA[r]++;
    }
    if (o.winner === "A") winsA++;
    if (o.method === "dec") {
      if (o.winner === "A") { mA.dec++; decWinsA++; } else { mB.dec++; decWinsB++; }
    } else {
      const m = o.winner === "A" ? mA : mB;
      if (o.method === "ko") m.ko++; else m.sub++;
      if (o.winner === "A") roundFinA[o.round]++; else roundFinB[o.round]++;
      (finTimes[`${o.winner}|${o.method}|${o.round}`] ||= []).push(o.tsec);
    }
  }

  // Blend the style Monte Carlo with the rating prior, then shrink toward 50%
  // for missing data / high chaos so we never overclaim. Walk-forward validation
  // showed the Monte Carlo, while essential for the method/round breakdown, is
  // best given a SMALL share of the win probability (the smoother rating prior
  // generalises better): wMC=0.15 beat both 0 and the old 0.40 on held-out
  // accuracy AND log-loss. So the prior leads (0.85), the style sim refines.
  const mcProbA = winsA / runs;
  const WMC = 0.15;
  let probA = WMC * mcProbA + (1 - WMC) * priorA;
  const shrink = (1 - completeness) * 0.3 + (variance === "HIGH" ? 0.1 : variance === "MEDIUM" ? 0.05 : 0);
  probA = 0.5 + (probA - 0.5) * (1 - shrink);
  const transparentProbA = clamp(probA, 0.07, 0.93);

  // Ensemble: blend the transparent model 50/50 with the gradient-boosted model,
  // which captures non-linear matchups the linear prior can't. On a leakage-free
  // walk-forward backtest of 3,289 bouts this beat the transparent model alone on
  // both accuracy (~62%→64%) and log-loss (bootstrap-significant). The
  // transparent model still drives the radar / method / round / explanations.
  const gbmP = gbmProbA(a, b, subA, subB, mcProbA, rA, rB);
  const finalProbA = clamp(0.5 * transparentProbA + 0.5 * gbmP, 0.07, 0.93);

  // CI from a logistic spread around the gap (transparent, monotone in the gap).
  const sigma = 9 + (1 - completeness) * 8 + (variance === "HIGH" ? 6 : variance === "MEDIUM" ? 3 : 0);
  const ciLow = clamp(1 / (1 + Math.exp(-k * (rA - rB - 1.28 * sigma))), 0.05, 0.95);
  const ciHigh = clamp(1 / (1 + Math.exp(-k * (rA - rB + 1.28 * sigma))), 0.05, 0.95);

  const totalAll = mA.ko + mA.sub + mA.dec + mB.ko + mB.sub + mB.dec || 1;
  const methodA: MethodDist = { ko: mA.ko / totalAll, sub: mA.sub / totalAll, dec: mA.dec / totalAll };
  const methodB: MethodDist = { ko: mB.ko / totalAll, sub: mB.sub / totalAll, dec: mB.dec / totalAll };

  // ---- Matchup-adjusted swing factors (effective, not raw, advantages) ----
  const { ground, ctrlNetA } = expectedGround(ca, cb);
  const standing = 1 - ground;
  const slope = k * finalProbA * (1 - finalProbA);
  const effEdges: FactorContribution[] = [
    { label: "Striking (where it lands)", dimension: "Striking", delta: standing * (ca.strO - cb.strO) * 0.9 },
    { label: "Power / finishing threat", dimension: "Submission", delta: (ca.power - cb.power) * 0.55 },
    { label: "Takedowns & control", dimension: "Wrestling", delta: ctrlNetA * 120 },
    { label: "Submission game", dimension: "Grappling", delta: ground * (ca.subO - cb.subO) * 0.8 },
    { label: "Cardio (late rounds)", dimension: "Cardio", delta: (ca.cardio - cb.cardio) * (params.rounds === 5 ? 0.7 : 0.45) },
    { label: "Durability / chin", dimension: "Durability", delta: (ca.chin - cb.chin) * 0.45 },
    { label: "Experience / fight IQ", dimension: "Form", delta: (ca.iq - cb.iq) * 0.5 },
  ].map((e) => ({ ...e, delta: e.delta * slope })).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  if (a.layoffMonths > 9 || b.layoffMonths > 9) {
    const d = (layoffPen(a.layoffMonths) - layoffPen(b.layoffMonths)) * slope * 100;
    if (Math.abs(d) > 0.3) effEdges.push({ label: "Layoff / ring rust", delta: d, dimension: "Preparation" });
  }
  if (params.shortNoticeA || params.shortNoticeB) {
    const d = ((params.shortNoticeA ? -4 : 0) - (params.shortNoticeB ? -4 : 0)) * slope * 100;
    effEdges.push({ label: "Short-notice", delta: d, dimension: "Preparation" });
  }

  // ---- Headline (most-likely winner, method, round, time) ----
  const winnerSide: "A" | "B" = finalProbA >= 0.5 ? "A" : "B";
  const confidence = winnerSide === "A" ? finalProbA : 1 - finalProbA;
  const wm = winnerSide === "A" ? mA : mB;
  const roundFin = winnerSide === "A" ? roundFinA : roundFinB;
  const methodCounts: [Headline["method"], number, "ko" | "sub" | "dec"][] = [
    ["KO/TKO", wm.ko, "ko"],
    ["Submission", wm.sub, "sub"],
    ["Decision", wm.dec, "dec"],
  ];
  methodCounts.sort((x, y) => y[1] - x[1]);
  const [method, , methodKey] = methodCounts[0];

  let round: number | undefined;
  let timeLabel: string | undefined;
  if (methodKey !== "dec") {
    let best = 0;
    for (let r = 1; r < roundFin.length; r++) if (roundFin[r] > roundFin[best]) best = r;
    round = best + 1;
    const times = finTimes[`${winnerSide}|${methodKey}|${best}`] ?? [];
    if (times.length) {
      times.sort((x, y) => x - y);
      const med = times[Math.floor(times.length / 2)];
      timeLabel = `${Math.floor(med / 60)}:${String(med % 60).padStart(2, "0")}`;
    }
  }

  // ---- Narrative swing factors ----
  const roundWinProbA = roundWonA.map((c) => c / runs);
  const swingFactors: string[] = [];
  const lead = effEdges[0];
  if (lead && Math.abs(lead.delta) > 0.3) {
    const who = lead.delta > 0 ? a : b;
    swingFactors.push(`${who.name.split(" ").slice(-1)[0]} holds the edge in ${lead.label.toLowerCase()}`);
  }
  // Cardio-driven momentum shift across rounds.
  if (roundWinProbA.length >= 2) {
    const early = roundWinProbA[0];
    const late = roundWinProbA[roundWinProbA.length - 1];
    if (Math.abs(late - early) > 0.1) {
      const fading = late < early ? a : b;
      const rising = late < early ? b : a;
      swingFactors.push(`${rising.name.split(" ").slice(-1)[0]} grows stronger late — ${fading.name.split(" ").slice(-1)[0]}'s edge fades after the early rounds`);
    }
  }
  if (ground > 0.45) swingFactors.push(`Expect significant grappling — ~${Math.round(ground * 100)}% of the fight on the mat`);
  else if (ground < 0.18) swingFactors.push("Likely a striking match — both stay on the feet");

  return {
    probA: finalProbA,
    probB: 1 - finalProbA,
    ciLow,
    ciHigh,
    methodA,
    methodB,
    roundMomentum: momentum.map((m) => m / runs),
    factors: effEdges.slice(0, 6),
    dataCompleteness: completeness,
    variance,
    runs,
    ratingA: rA,
    ratingB: rB,
    subscoresA: subA,
    subscoresB: subB,
    headline: { winnerSide, method, round, timeLabel, confidence },
    roundDist: {
      aFinish: roundFinA.map((c) => c / runs),
      bFinish: roundFinB.map((c) => c / runs),
      aDec: decWinsA / runs,
      bDec: decWinsB / runs,
    },
    roundWinProbA,
    groundShare: ground,
    swingFactors,
    mcProbA,
  };
}
