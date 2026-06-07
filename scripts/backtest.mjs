// ============================================================
// FightVex — leakage-free backtest of the Vex AI sim engine.
//
// For every collected bout (backtest/history.json) we rebuild BOTH
// fighters' inputs from ONLY their fights before that date, then run
// the EXACT deployed engine (src/lib/sim.ts) and compare its pick &
// probability to the real result. Reports pick accuracy, log-loss,
// Brier score and a calibration table.
//
// Stat derivation (statsFromAgg / estimateStats) is ported verbatim
// from src/lib/data/fighters.ts so reconstructed stats match prod.
//
// Run:  node scripts/backtest.mjs [runs]
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { simulate } from "../src/lib/sim.ts";
import { REAL_FIGHTERS } from "../src/lib/data/espn.generated.ts";
import { ROSTER_ADDITIONS } from "../src/lib/data/rankings.override.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HIST = join(ROOT, "backtest", "history.json");
const RUNS = Number(process.argv[2]) || 600;
const MIN_PRIOR = 2;     // each fighter needs ≥ this many prior fights w/ stats
const NOW = new Date("2026-06-05");

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;

// ---- bios (age/reach/height/stance) for fighters we have; defaults otherwise.
// caps() (the Monte-Carlo inputs) use NONE of these — they feed only the small
// 5%-weight "Physical" prior sub-score, so unknown-fighter defaults are low-impact.
const BIO = new Map();
for (const f of [...REAL_FIGHTERS, ...ROSTER_ADDITIONS]) {
  BIO.set(f.id, { age: f.age || 29, heightCm: f.heightCm || 178, reachCm: f.reachCm || (f.heightCm ? f.heightCm + 5 : 183), stance: f.stance || "Orthodox" });
}
const bioOf = (id) => BIO.get(id) || { age: 29, heightCm: 178, reachCm: 183, stance: "Orthodox" };

// ===== ported verbatim from fighters.ts =====
function statsFromAgg(f, a) {
  const min = Math.max(8, a.minutes);
  const fights = Math.max(1, a.fights);
  const rate15 = (v) => (v / min) * 15;
  let slpm = clamp(a.sigL / min, 0, 12);
  let sapm = clamp(a.oSigL / min, 0, 12);
  let strAcc = clamp(a.sigA > 0 ? (a.sigL / a.sigA) * 100 : 45, 20, 80);
  let strDef = clamp(a.oSigA > 0 ? (1 - a.oSigL / a.oSigA) * 100 : 50, 20, 88);
  let tdAvg = clamp(rate15(a.tdL), 0, 10);
  let tdAcc = clamp(a.tdA > 0 ? (a.tdL / a.tdA) * 100 : 25, 0, 95);
  let tdDef = clamp(a.oTdA > 0 ? (1 - a.oTdL / a.oTdA) * 100 : 55, 0, 100);
  let subAvg = clamp(rate15(a.sub), 0, 6);
  let kdAvg = clamp(rate15(a.kd), 0, 4);
  let ctrl = clamp(rate15(a.ctrl), 0, 9);
  let oppKdAvg = rate15(a.oKd);
  const w = clamp(min / (min + 28), 0.28, 0.93);
  const sh = (v, prior) => v * w + prior * (1 - w);
  slpm = sh(slpm, 3.4); sapm = sh(sapm, 3.4);
  strAcc = sh(strAcc, 45); strDef = sh(strDef, 53);
  tdAvg = sh(tdAvg, 1.2); tdAcc = sh(tdAcc, 36); tdDef = sh(tdDef, 60);
  subAvg = sh(subAvg, 0.45); kdAvg = sh(kdAvg, 0.4); ctrl = sh(ctrl, 1.6);
  oppKdAvg = sh(oppKdAvg, 0.35);
  const durability = clamp(100 - sapm * 6 - oppKdAvg * 16, 35, 98);
  const avgFightMin = min / fights;
  const cardio = clamp(40 + avgFightMin * 2.4 + Math.min(slpm, 6) * 1.2, 40, 99);
  const rawFin = (f.record.ko + f.record.sub) / Math.max(1, f.record.wins) * 100;
  const wFin = f.record.wins / (f.record.wins + 5);
  const finishRate = clamp(rawFin * wFin + 50 * (1 - wFin), 0, 100);
  return {
    slpm: r1(slpm), strAcc: Math.round(strAcc), sapm: r1(sapm), strDef: Math.round(strDef),
    tdAvg: r1(tdAvg), tdAcc: Math.round(tdAcc), tdDef: Math.round(tdDef), subAvg: r1(subAvg),
    ctrl: r1(ctrl), kdAvg: r1(kdAvg), cardio: Math.round(cardio), durability: Math.round(durability),
    finishRate: Math.round(finishRate),
  };
}

// ---- point-in-time reconstruction --------------------------------
// Build a fighter's pre-fight aggregate from the most recent ≤8 fights
// strictly before `date` (mirrors fetch_stats.py: own output + what
// opponents landed on them), plus their record up to that date.
function fightMinutes(b) {
  return b.finished ? (b.endRound - 1) * 5 + 2.5 : b.maxRounds * 5;
}
function reconstruct(fid, priorFights, date) {
  const last = priorFights.slice(-8);
  const A = { fights: 0, minutes: 0, sigL: 0, sigA: 0, oSigL: 0, oSigA: 0, tdL: 0, tdA: 0, oTdL: 0, oTdA: 0, kd: 0, oKd: 0, sub: 0, ctrl: 0 };
  for (const b of last) {
    const me = b.sides.find((s) => s.id === fid);
    const op = b.sides.find((s) => s.id !== fid);
    if (!me) continue;
    const mins = fightMinutes(b);
    A.fights++; A.minutes += mins;
    A.sigL += me.sigL; A.sigA += me.sigA; A.tdL += me.tdL; A.tdA += me.tdA;
    A.kd += me.kd; A.sub += me.sub; A.ctrl += me.ctrl / 60;
    if (op) { A.oSigL += op.sigL; A.oSigA += op.sigA; A.oTdL += op.tdL; A.oTdA += op.tdA; A.oKd += op.kd; }
  }
  // record up to (not incl.) this fight
  let wins = 0, losses = 0, draws = 0, finishes = 0, decWins = 0;
  for (const b of priorFights) {
    const me = b.sides.find((s) => s.id === fid);
    if (!me) continue;
    if (me.winner) { wins++; if (b.finished) finishes++; else decWins++; }
    else if (b.sides.some((s) => s.winner)) losses++;
    else draws++;
  }
  const record = { wins, losses, draws, ko: finishes, sub: 0, dec: decWins };
  const bio = bioOf(fid);
  const yrs = (NOW - new Date(date)) / (365.25 * 864e5);
  const age = clamp(Math.round(bio.age - yrs), 19, 45);
  // real point-in-time layoff (months since previous fight)
  let layoffMonths = 3;
  if (priorFights.length) {
    const prev = priorFights[priorFights.length - 1];
    layoffMonths = clamp(Math.round((new Date(date) - new Date(prev.date)) / (30.4 * 864e5)), 1, 36);
  }
  const total = wins + losses + draws;
  const oppQuality = Math.round(clamp(58 + (total > 18 ? 6 : 0), 55, 92));
  const fLike = { record };
  const stats = statsFromAgg(fLike, A);
  return {
    id: fid, name: fid, age, heightCm: bio.heightCm, reachCm: bio.reachCm,
    record, stats, oppQuality, layoffMonths,
    nFights: A.fights,
  };
}

// ===== load history, index per fighter chronologically =====
const { bouts, universe } = JSON.parse(readFileSync(HIST, "utf8"));
bouts.sort((a, b) => new Date(a.date) - new Date(b.date));
const byFighter = new Map();
for (const b of bouts) for (const s of b.sides) {
  if (!byFighter.has(s.id)) byFighter.set(s.id, []);
  byFighter.get(s.id).push(b);
}

// ===== run the engine over every analyzable bout (once) =====
function logloss(p, y) { const q = clamp(p, 1e-6, 1 - 1e-6); return -(y * Math.log(q) + (1 - y) * Math.log(1 - q)); }
const logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));
// Platt scaling: p' = sigmoid(a·logit(p) + b). a<1 reduces overconfidence; b corrects bias.
const platt = (p, a, b) => 1 / (1 + Math.exp(-(a * logit(p) + b)));
const temp = (p, t) => platt(p, t, 0);

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function buildEvals(runs) {
  const evals = [];
  let finReal = 0, decReal = 0;
  for (const bout of bouts) {
    // Symmetrize: deterministically pick which fighter is "A" so the A side has
    // no win base-rate skew (removes the ESPN competitor-ordering artifact).
    const swap = hash(bout.compId) & 1;
    const [s0, s1] = swap ? [bout.sides[1], bout.sides[0]] : bout.sides;
    const prior0 = (byFighter.get(s0.id) || []).filter((b) => new Date(b.date) < new Date(bout.date));
    const prior1 = (byFighter.get(s1.id) || []).filter((b) => new Date(b.date) < new Date(bout.date));
    const f0 = reconstruct(s0.id, prior0, bout.date);
    const f1 = reconstruct(s1.id, prior1, bout.date);
    if (f0.nFights < MIN_PRIOR || f1.nFights < MIN_PRIOR) continue;
    const res = simulate(f0, f1, { rounds: bout.maxRounds === 5 ? 5 : 3, runs });
    evals.push({ date: bout.date, pA: res.probA, yA: s0.winner ? 1 : 0, finished: bout.finished });
    if (bout.finished) finReal++; else decReal++;
  }
  return { evals, finRate: finReal / (finReal + decReal) };
}

function metrics(set, a = 1, b = 0) {
  let correct = 0, sumLL = 0, sumBrier = 0, aWins = 0;
  const buckets = Array.from({ length: 10 }, () => ({ n: 0, pred: 0, won: 0 }));
  const conf = { "0.50-0.60": [0, 0], "0.60-0.70": [0, 0], "0.70-0.85": [0, 0], "0.85-1.0": [0, 0] };
  for (const e of set) {
    const p = platt(e.pA, a, b), y = e.yA;
    if ((p >= 0.5 ? 1 : 0) === y) correct++;
    sumLL += logloss(p, y); sumBrier += (p - y) ** 2; aWins += y;
    const bi = Math.min(9, Math.floor(p * 10)); buckets[bi].n++; buckets[bi].pred += p; buckets[bi].won += y;
    const c = Math.max(p, 1 - p), favWon = (p >= 0.5) === (y === 1);
    const key = c < 0.6 ? "0.50-0.60" : c < 0.7 ? "0.60-0.70" : c < 0.85 ? "0.70-0.85" : "0.85-1.0";
    conf[key][0]++; if (favWon) conf[key][1]++;
  }
  const n = set.length;
  return {
    n, accuracy: correct / n, logloss: sumLL / n, brier: sumBrier / n, aWinBase: aWins / n,
    calibration: buckets.map((b, i) => ({ bucket: `${i / 10}-${(i + 1) / 10}`, n: b.n, predicted: b.n ? b.pred / b.n : 0, actual: b.n ? b.won / b.n : 0 })),
    byConfidence: Object.fromEntries(Object.entries(conf).map(([k, [tot, w]]) => [k, { n: tot, accuracy: tot ? w / tot : 0 }])),
  };
}

function bestPlatt(set) {
  let A = 1, B = 0, bestLL = Infinity;
  for (let a = 0.40; a <= 1.30; a += 0.01) {
    for (let b = -0.40; b <= 0.40; b += 0.02) {
      const ll = metrics(set, a, b).logloss;
      if (ll < bestLL) { bestLL = ll; A = a; B = b; }
    }
  }
  return { a: +A.toFixed(2), b: +B.toFixed(2) };
}

console.log(`Universe ${universe} fighters · ${bouts.length} bouts collected · runs=${RUNS} · MIN_PRIOR=${MIN_PRIOR}`);
const t0 = Date.now();
const { evals, finRate } = buildEvals(RUNS);
evals.sort((a, b) => new Date(a.date) - new Date(b.date));
console.log(`Analyzed ${evals.length} bouts in ${((Date.now() - t0) / 1000).toFixed(1)}s · real finish rate ${(finRate * 100).toFixed(0)}%`);

// chronological 70/30 split — fit calibration on TRAIN only, report on held-out TEST
const cut = Math.floor(evals.length * 0.7);
const train = evals.slice(0, cut), test = evals.slice(cut);
const { a, b } = bestPlatt(train);

const show = (label, m) => {
  console.log(`\n=== ${label} (n=${m.n}) ===`);
  console.log(`Accuracy ${(m.accuracy * 100).toFixed(1)}%  ·  Log-loss ${m.logloss.toFixed(4)}  ·  Brier ${m.brier.toFixed(4)}  ·  A-win base ${(m.aWinBase * 100).toFixed(1)}%`);
  console.log("Accuracy by confidence:");
  for (const [k, v] of Object.entries(m.byConfidence)) console.log(`  ${k}: ${(v.accuracy * 100).toFixed(1)}% (n=${v.n})`);
  console.log("Calibration (pred vs actual):");
  for (const c of m.calibration) if (c.n) console.log(`  ${c.bucket}: pred ${(c.predicted * 100).toFixed(0)}% actual ${(c.actual * 100).toFixed(0)}% (n=${c.n})`);
};

const full = metrics(evals, 1, 0);
const fullCal = metrics(evals, a, b);
const testRaw = metrics(test, 1, 0);
const testCal = metrics(test, a, b);
show("FULL SET — raw", full);
console.log(`\nFitted Platt calibration on train (n=${train.length}): a=${a}  b=${b}`);
show("HELD-OUT TEST — raw", testRaw);
show("HELD-OUT TEST — calibrated", testCal);
console.log(`\nΔ test log-loss: ${testRaw.logloss.toFixed(4)} → ${testCal.logloss.toFixed(4)}  (${testCal.logloss < testRaw.logloss ? "improved" : "worse"})`);

writeFileSync(join(ROOT, "backtest", "result.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), universe, boutsCollected: bouts.length, analyzed: evals.length,
  runs: RUNS, minPrior: MIN_PRIOR, realFinishRate: finRate, platt: { a, b },
  full, fullCal, testRaw, testCal,
}, null, 2));
console.log(`\n→ wrote backtest/result.json`);

// ---- committed artifact the site imports (real, verified numbers only) ----
const yrs = bouts.map((b) => new Date(b.date).getUTCFullYear());
const cal = full.calibration.filter((c) => c.n >= 10).map((c) => ({ bucket: c.bucket, predicted: +c.predicted.toFixed(3), actual: +c.actual.toFixed(3), n: c.n }));
const round = (v, d = 3) => +v.toFixed(d);
const artifact = `// ============================================================
// AUTO-GENERATED by scripts/backtest.mjs — DO NOT EDIT BY HAND.
// Leakage-free historical backtest of the Vex AI engine: every bout's
// inputs were rebuilt from ONLY each fighter's prior fights, then run
// through the live engine and compared to the real ESPN result.
// Regenerate: node scripts/fetch-history.mjs && node scripts/backtest.mjs 1000
// ============================================================
/* eslint-disable */
export interface BacktestCalibration { bucket: string; predicted: number; actual: number; n: number; }
export interface BacktestRecord {
  generatedAt: string;
  fighters: number;          // distinct fighters in the dataset
  boutsCollected: number;    // real bouts with full reconstructable history
  backtested: number;        // bouts actually scored (both sides ≥2 prior fights)
  yearFrom: number; yearTo: number;
  accuracy: number;          // pick accuracy, full set
  accuracyRecent: number;    // pick accuracy, held-out recent 30%
  logLoss: number; logLossRecent: number; brier: number;
  realFinishRate: number;    // real finish (non-decision) rate in the set
  calibration: BacktestCalibration[];
}
export const BACKTEST: BacktestRecord = {
  generatedAt: ${JSON.stringify(new Date().toISOString())},
  fighters: ${universe},
  boutsCollected: ${bouts.length},
  backtested: ${evals.length},
  yearFrom: ${Math.min(...yrs)},
  yearTo: ${Math.max(...yrs)},
  accuracy: ${round(full.accuracy)},
  accuracyRecent: ${round(testRaw.accuracy)},
  logLoss: ${round(full.logloss)},
  logLossRecent: ${round(testRaw.logloss)},
  brier: ${round(full.brier)},
  realFinishRate: ${round(finRate)},
  calibration: ${JSON.stringify(cal)},
};
`;
writeFileSync(join(ROOT, "src", "lib", "data", "backtest.generated.ts"), artifact, "utf8");
console.log(`→ wrote src/lib/data/backtest.generated.ts`);
