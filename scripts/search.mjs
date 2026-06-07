// Search the MC/prior blend (wMC) and prior slope (k) for the lowest held-out
// log-loss, recomputing the final probability from the engine's raw components
// (mcProbA, ratingA/B, completeness, variance) — no need to re-run the MC.
// Fits on the chronological train split, reports on the held-out test split.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { simulate } from "../src/lib/sim.ts";
import { REAL_FIGHTERS } from "../src/lib/data/espn.generated.ts";
import { ROSTER_ADDITIONS } from "../src/lib/data/rankings.override.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;
const K0 = 0.085; // current production slope
const NOW = new Date("2026-06-05");

const BIO = new Map();
for (const f of [...REAL_FIGHTERS, ...ROSTER_ADDITIONS]) BIO.set(f.id, { age: f.age || 29, heightCm: f.heightCm || 178, reachCm: f.reachCm || (f.heightCm ? f.heightCm + 5 : 183) });
const bioOf = (id) => BIO.get(id) || { age: 29, heightCm: 178, reachCm: 183 };

function statsFromAgg(f, a) {
  const min = Math.max(8, a.minutes), fights = Math.max(1, a.fights), rate15 = (v) => (v / min) * 15;
  let slpm = clamp(a.sigL / min, 0, 12), sapm = clamp(a.oSigL / min, 0, 12);
  let strAcc = clamp(a.sigA > 0 ? (a.sigL / a.sigA) * 100 : 45, 20, 80), strDef = clamp(a.oSigA > 0 ? (1 - a.oSigL / a.oSigA) * 100 : 50, 20, 88);
  let tdAvg = clamp(rate15(a.tdL), 0, 10), tdAcc = clamp(a.tdA > 0 ? (a.tdL / a.tdA) * 100 : 25, 0, 95), tdDef = clamp(a.oTdA > 0 ? (1 - a.oTdL / a.oTdA) * 100 : 55, 0, 100);
  let subAvg = clamp(rate15(a.sub), 0, 6), kdAvg = clamp(rate15(a.kd), 0, 4), ctrl = clamp(rate15(a.ctrl), 0, 9), oppKdAvg = rate15(a.oKd);
  const w = clamp(min / (min + 28), 0.28, 0.93), sh = (v, p) => v * w + p * (1 - w);
  slpm = sh(slpm, 3.4); sapm = sh(sapm, 3.4); strAcc = sh(strAcc, 45); strDef = sh(strDef, 53);
  tdAvg = sh(tdAvg, 1.2); tdAcc = sh(tdAcc, 36); tdDef = sh(tdDef, 60); subAvg = sh(subAvg, 0.45); kdAvg = sh(kdAvg, 0.4); ctrl = sh(ctrl, 1.6); oppKdAvg = sh(oppKdAvg, 0.35);
  const durability = clamp(100 - sapm * 6 - oppKdAvg * 16, 35, 98), cardio = clamp(40 + (min / fights) * 2.4 + Math.min(slpm, 6) * 1.2, 40, 99);
  const rawFin = (f.record.ko + f.record.sub) / Math.max(1, f.record.wins) * 100, wFin = f.record.wins / (f.record.wins + 5);
  const finishRate = clamp(rawFin * wFin + 50 * (1 - wFin), 0, 100);
  return { slpm: r1(slpm), strAcc: Math.round(strAcc), sapm: r1(sapm), strDef: Math.round(strDef), tdAvg: r1(tdAvg), tdAcc: Math.round(tdAcc), tdDef: Math.round(tdDef), subAvg: r1(subAvg), ctrl: r1(ctrl), kdAvg: r1(kdAvg), cardio: Math.round(cardio), durability: Math.round(durability), finishRate: Math.round(finishRate) };
}
const fightMinutes = (b) => b.finished ? (b.endRound - 1) * 5 + 2.5 : b.maxRounds * 5;
function reconstruct(fid, prior, date) {
  const last = prior.slice(-8), A = { fights: 0, minutes: 0, sigL: 0, sigA: 0, oSigL: 0, oSigA: 0, tdL: 0, tdA: 0, oTdL: 0, oTdA: 0, kd: 0, oKd: 0, sub: 0, ctrl: 0 };
  for (const b of last) { const me = b.sides.find((s) => s.id === fid), op = b.sides.find((s) => s.id !== fid); if (!me) continue; const mins = fightMinutes(b); A.fights++; A.minutes += mins; A.sigL += me.sigL; A.sigA += me.sigA; A.tdL += me.tdL; A.tdA += me.tdA; A.kd += me.kd; A.sub += me.sub; A.ctrl += me.ctrl / 60; if (op) { A.oSigL += op.sigL; A.oSigA += op.sigA; A.oTdL += op.tdL; A.oTdA += op.tdA; A.oKd += op.kd; } }
  let wins = 0, losses = 0, draws = 0, fin = 0, decW = 0;
  for (const b of prior) { const me = b.sides.find((s) => s.id === fid); if (!me) continue; if (me.winner) { wins++; if (b.finished) fin++; else decW++; } else if (b.sides.some((s) => s.winner)) losses++; else draws++; }
  const record = { wins, losses, draws, ko: fin, sub: 0, dec: decW }, bio = bioOf(fid);
  const age = clamp(Math.round(bio.age - (NOW - new Date(date)) / (365.25 * 864e5)), 19, 45);
  let layoffMonths = 3; if (prior.length) layoffMonths = clamp(Math.round((new Date(date) - new Date(prior[prior.length - 1].date)) / (30.4 * 864e5)), 1, 36);
  const total = wins + losses + draws, oppQuality = Math.round(clamp(58 + (total > 18 ? 6 : 0), 55, 92));
  return { id: fid, name: fid, age, heightCm: bio.heightCm, reachCm: bio.reachCm, record, stats: statsFromAgg({ record }, A), oppQuality, layoffMonths, nFights: A.fights };
}

const { bouts } = JSON.parse(readFileSync(join(ROOT, "backtest", "history.json"), "utf8"));
bouts.sort((a, b) => new Date(a.date) - new Date(b.date));
const byFighter = new Map();
for (const b of bouts) for (const s of b.sides) { if (!byFighter.has(s.id)) byFighter.set(s.id, []); byFighter.get(s.id).push(b); }
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));

// Run the engine once per bout, capturing the components needed to recompute
// the final prob for any (wMC, k) without re-running the Monte Carlo.
const recs = [];
for (const bout of bouts) {
  const swap = hash(bout.compId) & 1;
  const [s0, s1] = swap ? [bout.sides[1], bout.sides[0]] : bout.sides;
  const f0 = reconstruct(s0.id, (byFighter.get(s0.id) || []).filter((b) => new Date(b.date) < new Date(bout.date)), bout.date);
  const f1 = reconstruct(s1.id, (byFighter.get(s1.id) || []).filter((b) => new Date(b.date) < new Date(bout.date)), bout.date);
  if (f0.nFights < 2 || f1.nFights < 2) continue;
  const r = simulate(f0, f1, { rounds: bout.maxRounds === 5 ? 5 : 3, runs: 1000 });
  const shrink = (1 - r.dataCompleteness) * 0.3 + (r.variance === "HIGH" ? 0.1 : r.variance === "MEDIUM" ? 0.05 : 0);
  recs.push({ date: bout.date, mc: r.mcProbA, rA: r.ratingA, rB: r.ratingB, shrink, yA: s0.winner ? 1 : 0 });
}
const cut = Math.floor(recs.length * 0.7), train = recs.slice(0, cut), test = recs.slice(cut);

function prob(rec, wMC, k) {
  const prior = 1 / (1 + Math.exp(-k * (rec.rA - rec.rB)));
  let p = wMC * rec.mc + (1 - wMC) * prior;
  p = 0.5 + (p - 0.5) * (1 - rec.shrink);
  return clamp(p, 0.07, 0.93);
}
function evalSet(set, wMC, k) {
  let ll = 0, acc = 0;
  for (const r of set) { const p = prob(r, wMC, k); ll += -(r.yA * Math.log(clamp(p, 1e-6, 1 - 1e-6)) + (1 - r.yA) * Math.log(1 - clamp(p, 1e-6, 1 - 1e-6))); if ((p >= 0.5 ? 1 : 0) === r.yA) acc++; }
  return { ll: ll / set.length, acc: acc / set.length };
}

console.log(`Analyzed ${recs.length} bouts · train ${train.length} / test ${test.length}`);
const base = evalSet(test, 0.5, K0);
console.log(`Baseline (wMC=0.50, k=${K0}): test log-loss ${base.ll.toFixed(4)}  acc ${(base.acc * 100).toFixed(1)}%`);

let best = { wMC: 0.5, k: K0, ll: Infinity };
for (let wMC = 0.30; wMC <= 0.85; wMC += 0.05) for (let k = 0.05; k <= 0.14; k += 0.005) {
  const ll = evalSet(train, wMC, k).ll;
  if (ll < best.ll) best = { wMC: +wMC.toFixed(2), k: +k.toFixed(3), ll };
}
const bt = evalSet(test, best.wMC, best.k);
console.log(`Best on TRAIN: wMC=${best.wMC}, k=${best.k}  → TEST log-loss ${bt.ll.toFixed(4)}  acc ${(bt.acc * 100).toFixed(1)}%`);
console.log(`Δ test log-loss vs baseline: ${(bt.ll - base.ll).toFixed(4)}  acc Δ ${((bt.acc - base.acc) * 100).toFixed(1)}pp`);

// Sensitivity grid (test log-loss) around the blend, at the best k
console.log(`\nTest log-loss by wMC (k=${best.k}):`);
for (let wMC = 0.30; wMC <= 0.85; wMC += 0.05) { const e = evalSet(test, +wMC.toFixed(2), best.k); console.log(`  wMC=${wMC.toFixed(2)}: ll ${e.ll.toFixed(4)}  acc ${(e.acc * 100).toFixed(1)}%`); }

console.log(`\nCandidate configs on TEST:`);
for (const [w,k] of [[0.5,0.085],[0.45,0.11],[0.45,0.12],[0.4,0.11],[0.5,0.11]]) {
  const e = evalSet(test, w, k); console.log(`  wMC=${w}, k=${k}: ll ${e.ll.toFixed(4)} acc ${(e.acc*100).toFixed(1)}%`);
}
