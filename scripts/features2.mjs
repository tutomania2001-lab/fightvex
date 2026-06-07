// ============================================================
// FightVex — ENRICHED point-in-time feature extractor (v2).
// Everything features.mjs has, PLUS engineered features computed from each
// fighter's prior-fight history (no leakage): recency-weighted form, current
// win/loss streak, recent activity, recency-weighted finish rate, recent fight
// duration, age-decline, reach diff, stance mismatch. Feeds the GBM/ensemble.
//
// Run:  node scripts/features2.mjs [runs]
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { simulate, subscores } from "../src/lib/sim.ts";
import { REAL_FIGHTERS } from "../src/lib/data/espn.generated.ts";
import { ROSTER_ADDITIONS } from "../src/lib/data/rankings.override.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HIST = join(ROOT, "backtest", "history.json");
const OUT = join(ROOT, "backtest", "features2.json");
const RUNS = Number(process.argv[2]) || 800;
const MIN_PRIOR = 2, NOW = new Date("2026-06-06");
const CATS = ["Striking", "Wrestling", "Grappling", "Cardio", "Durability", "Form", "Competition", "Submission", "Physical"];
const ENG = ["recForm", "streak", "activity", "recFinish", "avgDur", "ageDecline", "reach", "stanceMis", "age", "exp"];
// Style-MATCHUP interaction features ("styles make fights") — each fighter's
// stylistic threat measured AGAINST the specific opponent's weakness, not in a
// vacuum. Signed A-vs-B (except `clash`, a symmetric volatility magnitude).
// Computed from the SAME stat fields available on the live Fighter object, so
// the runtime (gbm.ts) reproduces them exactly.
const STY = ["grapMismatch", "pressChin", "finChin", "ctrlMismatch", "styleClash"];
function styleFeats(A, B) {
  const grapThreat = (x) => x.tdAvg / 5 + x.ctrl / 9 + x.subAvg / 2;     // wrestling+grappling+sub offense
  const finThreat = (x) => x.kdAvg / 2 + x.finishRate / 100;            // knockout/finish danger
  const chin = (x) => (100 - x.durability) / 100;                       // how hittable / finishable
  const tdHole = (x) => (100 - x.tdDef) / 100;                          // exploitable takedown defense
  const strHole = (x) => (100 - x.strDef) / 100;                        // exploitable striking defense
  const orient = (x) => (x.tdAvg / 5 + x.ctrl / 9) - x.slpm / 6;        // + grappler … − striker
  return [
    grapThreat(A) * tdHole(B) - grapThreat(B) * tdHole(A),                              // grappler vs poor TD defense
    (A.slpm / 6 * A.strAcc / 100) * strHole(B) - (B.slpm / 6 * B.strAcc / 100) * strHole(A), // striking pressure vs porous D
    finThreat(A) * chin(B) - finThreat(B) * chin(A),                                    // finisher vs weak chin
    (A.ctrl / 9) * tdHole(B) - (B.ctrl / 9) * tdHole(A),                                // control-grappler vs poor TD defense
    Math.abs(orient(A) - orient(B)),                                                    // striker-vs-grappler clash (volatility)
  ];
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), r1 = (v) => Math.round(v * 10) / 10;
const BIO = new Map();
const southpaw = (s) => /southpaw/i.test(s || "");
for (const f of [...REAL_FIGHTERS, ...ROSTER_ADDITIONS]) BIO.set(f.id, { age: f.age || 29, heightCm: f.heightCm || 178, reachCm: f.reachCm || (f.heightCm ? f.heightCm + 5 : 183), south: southpaw(f.stance) });
const bioOf = (id) => BIO.get(id) || { age: 29, heightCm: 178, reachCm: 183, south: false };

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

function build(fid, prior, date) {
  // aggregate last 8 for stats
  const last = prior.slice(-8), A = { fights: 0, minutes: 0, sigL: 0, sigA: 0, oSigL: 0, oSigA: 0, tdL: 0, tdA: 0, oTdL: 0, oTdA: 0, kd: 0, oKd: 0, sub: 0, ctrl: 0 };
  for (const b of last) { const me = b.sides.find((s) => s.id === fid), op = b.sides.find((s) => s.id !== fid); if (!me) continue; const mins = fightMinutes(b); A.fights++; A.minutes += mins; A.sigL += me.sigL; A.sigA += me.sigA; A.tdL += me.tdL; A.tdA += me.tdA; A.kd += me.kd; A.sub += me.sub; A.ctrl += me.ctrl / 60; if (op) { A.oSigL += op.sigL; A.oSigA += op.sigA; A.oTdL += op.tdL; A.oTdA += op.tdA; A.oKd += op.kd; } }
  let wins = 0, losses = 0, draws = 0, fin = 0, decW = 0;
  for (const b of prior) { const me = b.sides.find((s) => s.id === fid); if (!me) continue; if (me.winner) { wins++; if (b.finished) fin++; else decW++; } else if (b.sides.some((s) => s.winner)) losses++; else draws++; }
  const record = { wins, losses, draws, ko: fin, sub: 0, dec: decW }, bio = bioOf(fid);
  const age = clamp(Math.round(bio.age - (NOW - new Date(date)) / (365.25 * 864e5)), 19, 45);
  let layoffMonths = 3; if (prior.length) layoffMonths = clamp(Math.round((new Date(date) - new Date(prior[prior.length - 1].date)) / (30.4 * 864e5)), 1, 36);
  const total = wins + losses + draws, oppQuality = Math.round(clamp(58 + (total > 18 ? 6 : 0), 55, 92));
  const F = { id: fid, name: fid, age, heightCm: bio.heightCm, reachCm: bio.reachCm, record, stats: statsFromAgg({ record }, A), oppQuality, layoffMonths, nFights: A.fights };

  // engineered, most-recent-first
  const t = new Date(date).getTime(), res = [];
  for (let i = prior.length - 1; i >= 0; i--) { const b = prior[i], me = b.sides.find((s) => s.id === fid); if (!me) continue; res.push({ won: me.winner, lost: !me.winner && b.sides.some((s) => s.winner), finished: b.finished, mins: fightMinutes(b), t: new Date(b.date).getTime() }); }
  const decay = 0.8; let wsum = 0, w = 0; res.forEach((r, i) => { const wt = decay ** i; wsum += wt * (r.won ? 1 : 0); w += wt; });
  const recForm = w ? wsum / w : 0.5;
  let streak = 0; for (const r of res) { if (streak >= 0 && r.won) streak++; else if (streak <= 0 && r.lost) streak--; else break; }
  const activity = res.filter((r) => (t - r.t) < 730 * 864e5).length;
  let fsum = 0, fw = 0; res.forEach((r, i) => { if (r.won) { const wt = decay ** i; fsum += wt * (r.finished ? 1 : 0); fw += wt; } });
  const recFinish = fw ? fsum / fw : 0.5;
  const recent = res.slice(0, 5), avgDur = recent.length ? recent.reduce((s, r) => s + r.mins, 0) / recent.length : 12.5;
  const eng = { recForm, streak, activity, recFinish, avgDur, ageDecline: Math.max(0, age - 33), reach: bio.reachCm, south: bio.south, age, exp: total };
  return { F, eng };
}

const { bouts } = JSON.parse(readFileSync(HIST, "utf8"));
bouts.sort((a, b) => new Date(a.date) - new Date(b.date));
const byFighter = new Map();
for (const b of bouts) for (const s of b.sides) { if (!byFighter.has(s.id)) byFighter.set(s.id, []); byFighter.get(s.id).push(b); }

// ---- BEHAVIORAL mining (from the actual per-fight record, not just averages) ----
// Each fighter's career striker↔grappler ORIENTATION (a stable style trait used
// only to BUCKET opponents, never as an outcome) → +grappler … −striker.
const BEH = ["wrVsOppStyle", "earlyFinish", "getsFinished", "decRate", "trajectory"];
const orientationStatic = new Map();
for (const [id, fs] of byFighter) {
  let sig = 0, td = 0, ctrl = 0, min = 0;
  for (const b of fs) { const me = b.sides.find((s) => s.id === id); if (!me) continue; sig += me.sigL; td += me.tdL; ctrl += me.ctrl / 60; min += fightMinutes(b); }
  if (min < 8) { orientationStatic.set(id, 0); continue; }
  const gRate = (td + ctrl * 0.5) / min * 15, sRate = sig / min;
  orientationStatic.set(id, Math.tanh(gRate / 2 - sRate / 4)); // + grappler … − striker
}
const oppBucket = (id) => { const o = orientationStatic.get(id) ?? 0; return o > 0.15 ? "G" : o < -0.15 ? "S" : "B"; };

// Point-in-time behavioral profile from a fighter's PRIOR fights only (no leakage),
// plus their win-rate vs the CURRENT opponent's style bucket.
function behFeats(fid, prior, oppStyle) {
  let w = 0, l = 0, vGw = 0, vGn = 0, vSw = 0, vSn = 0, earlyW = 0, finLoss = 0, dec = 0;
  const seq = [];
  for (const b of prior) {
    const me = b.sides.find((s) => s.id === fid), op = b.sides.find((s) => s.id !== fid); if (!me) continue;
    const won = !!me.winner, lost = !won && b.sides.some((s) => s.winner);
    if (won) w++; else if (lost) l++;
    seq.push(won ? 1 : lost ? 0 : 0.5);
    if (op) { const bk = oppBucket(op.id); if (bk === "G") { vGn++; if (won) vGw++; } else if (bk === "S") { vSn++; if (won) vSw++; } }
    if (won && b.finished && b.endRound === 1) earlyW++;
    if (won && !b.finished) dec++;
    if (lost && b.finished) finLoss++;
  }
  const tot = w + l || 1;
  const vGWR = vGn ? vGw / vGn : 0.5, vSWR = vSn ? vSw / vSn : 0.5;
  const wrVsOppStyle = oppStyle === "G" ? vGWR : oppStyle === "S" ? vSWR : w / tot;
  const last3 = seq.slice(-3), rest = seq.slice(0, -3);
  const mean = (a, d) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : d;
  const base = mean(seq, 0.5);
  return { wrVsOppStyle, earlyFinish: w ? earlyW / w : 0, getsFinished: l ? finLoss / l : 0, decRate: (w + l) ? dec / (w + l) : 0.5, trajectory: mean(last3, base) - mean(rest, base) };
}
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---- OPPONENT-ADJUSTED RATING (Elo), chronological → naturally leakage-free.
// Beating a strong opponent moves you more than beating a weak one; finishes
// count slightly more; new fighters get a higher provisional K. The PRE-fight
// rating gap is the feature (captured before each bout updates the ladder).
const ELO = ["eloDiff"];
const eloMap = new Map(), games = new Map();
const elo = (id) => eloMap.get(id) ?? 1500;
function bumpElo(idA, idB, eA, eB, scoreA, finished) {
  const gA = games.get(idA) || 0, gB = games.get(idB) || 0;
  const kA = (gA < 5 ? 40 : 24) * (finished ? 1.15 : 1), kB = (gB < 5 ? 40 : 24) * (finished ? 1.15 : 1);
  const expA = 1 / (1 + 10 ** ((eB - eA) / 400));
  eloMap.set(idA, eA + kA * (scoreA - expA));
  eloMap.set(idB, eB + kB * ((1 - scoreA) - (1 - expA)));
  games.set(idA, gA + 1); games.set(idB, gB + 1);
}

const rows = [], t0 = Date.now();
for (const bout of bouts) {
  const swap = hash(bout.compId) & 1;
  const [s0, s1] = swap ? [bout.sides[1], bout.sides[0]] : bout.sides;
  // pre-fight ratings (feature), then immediately update the ladder for ALL
  // bouts — even those we don't emit — so ratings stay correct over time.
  const eA = elo(s0.id), eB = elo(s1.id);
  const eloDiff = eA - eB;
  bumpElo(s0.id, s1.id, eA, eB, s0.winner ? 1 : (s1.winner ? 0 : 0.5), bout.finished);
  const prior0 = (byFighter.get(s0.id) || []).filter((b) => new Date(b.date) < new Date(bout.date));
  const prior1 = (byFighter.get(s1.id) || []).filter((b) => new Date(b.date) < new Date(bout.date));
  const b0 = build(s0.id, prior0, bout.date);
  const b1 = build(s1.id, prior1, bout.date);
  if (b0.F.nFights < MIN_PRIOR || b1.F.nFights < MIN_PRIOR) continue;
  const sa = subscores(b0.F), sb = subscores(b1.F);
  const diff = CATS.map((c) => sa[c] - sb[c]);
  const e0 = b0.eng, e1 = b1.eng;
  const efeat = [
    e0.recForm - e1.recForm, e0.streak - e1.streak, e0.activity - e1.activity,
    e0.recFinish - e1.recFinish, e0.avgDur - e1.avgDur, e0.ageDecline - e1.ageDecline,
    e0.reach - e1.reach, (e0.south !== e1.south ? 1 : 0), e0.age - e1.age, e0.exp - e1.exp,
  ];
  const style = styleFeats(b0.F.stats, b1.F.stats);
  const h0 = behFeats(s0.id, prior0, oppBucket(s1.id)), h1 = behFeats(s1.id, prior1, oppBucket(s0.id));
  const beh = [h0.wrVsOppStyle - h1.wrVsOppStyle, h0.earlyFinish - h1.earlyFinish, h0.getsFinished - h1.getsFinished, h0.decRate - h1.decRate, h0.trajectory - h1.trajectory];
  const res = simulate(b0.F, b1.F, { rounds: bout.maxRounds === 5 ? 5 : 3, runs: RUNS });
  const pFin = res.methodA.ko + res.methodA.sub + res.methodB.ko + res.methodB.sub;
  rows.push({ date: bout.date, y: s0.winner ? 1 : 0, diff, efeat, style, beh, elo: [eloDiff], mc: res.mcProbA, gap: res.ratingA - res.ratingB, pFin, comp: res.dataCompleteness, variance: res.variance, maxRounds: bout.maxRounds, finished: bout.finished });
}
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), cats: CATS, eng: ENG, sty: STY, beh: BEH, elo: ELO, runs: RUNS, n: rows.length, rows }));
console.log(`Built ${rows.length} enriched rows (${CATS.length}+${ENG.length}+${STY.length}+${BEH.length}+${ELO.length} feats) in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT}`);
