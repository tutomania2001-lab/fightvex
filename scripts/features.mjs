// ============================================================
// FightVex — point-in-time FEATURE EXTRACTOR for model tuning.
// For every analyzable historical bout, rebuild both fighters from ONLY their
// earlier fights (no leakage), then record: the 9 category sub-score diffs
// (A−B), the engine's raw Monte-Carlo prob, the rating gap, data completeness,
// the real label, and metadata. A/B is symmetrized (deterministic coin per
// bout) so there's no side base-rate bias. Cached to backtest/features.json.
//
// Run:  node scripts/features.mjs
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { simulate, subscores } from "../src/lib/sim.ts";
import { REAL_FIGHTERS } from "../src/lib/data/espn.generated.ts";
import { ROSTER_ADDITIONS } from "../src/lib/data/rankings.override.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HIST = join(ROOT, "backtest", "history.json");
const OUT = join(ROOT, "backtest", "features.json");
const RUNS = Number(process.argv[2]) || 1000;
const MIN_PRIOR = 2;
const NOW = new Date("2026-06-05");
const CATS = ["Striking", "Wrestling", "Grappling", "Cardio", "Durability", "Form", "Competition", "Submission", "Physical"];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;

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

const { bouts } = JSON.parse(readFileSync(HIST, "utf8"));
bouts.sort((a, b) => new Date(a.date) - new Date(b.date));
const byFighter = new Map();
for (const b of bouts) for (const s of b.sides) { if (!byFighter.has(s.id)) byFighter.set(s.id, []); byFighter.get(s.id).push(b); }
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const rows = [];
const t0 = Date.now();
for (const bout of bouts) {
  const swap = hash(bout.compId) & 1;
  const [s0, s1] = swap ? [bout.sides[1], bout.sides[0]] : bout.sides;
  const f0 = reconstruct(s0.id, (byFighter.get(s0.id) || []).filter((b) => new Date(b.date) < new Date(bout.date)), bout.date);
  const f1 = reconstruct(s1.id, (byFighter.get(s1.id) || []).filter((b) => new Date(b.date) < new Date(bout.date)), bout.date);
  if (f0.nFights < MIN_PRIOR || f1.nFights < MIN_PRIOR) continue;
  const sa = subscores(f0), sb = subscores(f1);
  const diff = CATS.map((c) => sa[c] - sb[c]);
  const res = simulate(f0, f1, { rounds: bout.maxRounds === 5 ? 5 : 3, runs: RUNS });
  // winRate diff (record baseline) — point-in-time
  const wr = (r) => { const t = r.wins + r.losses + r.draws; return t ? r.wins / t : 0.5; };
  rows.push({
    date: bout.date, y: s0.winner ? 1 : 0,
    diff, mc: res.mcProbA, prob: res.probA, gap: res.ratingA - res.ratingB,
    comp: res.dataCompleteness, variance: res.variance,
    maxRounds: bout.maxRounds, finished: bout.finished, depth: Math.min(f0.nFights, f1.nFights),
    wrDiff: wr(f0.record) - wr(f1.record), expDiff: f0.nFights - f1.nFights,
  });
}
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), cats: CATS, runs: RUNS, n: rows.length, rows }));
console.log(`Built ${rows.length} feature rows in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT}`);
const base = rows.filter((r) => r.y).length / rows.length;
console.log(`A-win base rate: ${(base * 100).toFixed(1)}%  (symmetrized → should be ~50%)`);
