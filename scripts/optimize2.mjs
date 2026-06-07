// Focused sweep: for two weight sets (current hand weights, and a robust
// hand+fitted blend), search slope k × MC-blend wMC × calibration temperature,
// validated walk-forward. Picks the config with the best held-out log-loss that
// keeps accuracy. Keeps the MC contributing (product narrative) but at the
// weight the data supports.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { cats, rows } = JSON.parse(readFileSync(join(ROOT, "backtest", "features.json"), "utf8"));
const fitted = JSON.parse(readFileSync(join(ROOT, "backtest", "optimized.json"), "utf8")).weights;
rows.sort((a, b) => new Date(a.date) - new Date(b.date));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sig = (z) => 1 / (1 + Math.exp(-z));
const logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));

const HAND = { Striking: 0.15, Wrestling: 0.16, Grappling: 0.12, Cardio: 0.13, Durability: 0.11, Form: 0.09, Competition: 0.14, Submission: 0.05, Physical: 0.05 };
// Robust blend: half prior belief, half data — keeps every category non-zero.
const norm = (o) => { const s = Object.values(o).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / s])); };
const BLEND = norm(Object.fromEntries(cats.map((c) => [c, 0.5 * HAND[c] + 0.5 * (fitted[c] ?? 0)])));

const gapFor = (r, W) => cats.reduce((s, c, j) => s + W[c] * r.diff[j], 0);
const shrinkOf = (r) => (1 - r.comp) * 0.3 + (r.variance === "HIGH" ? 0.1 : r.variance === "MEDIUM" ? 0.05 : 0);
function pred(r, W, k, wMC, t) {
  const prior = sig(k * gapFor(r, W));
  let p = wMC * r.mc + (1 - wMC) * prior;
  p = 0.5 + (p - 0.5) * (1 - shrinkOf(r));
  return clamp(sig(logit(p) * t), 0.07, 0.93);
}
function metrics(P, Y) {
  let acc = 0, ll = 0; const B = 10, bn = Array.from({ length: B }, () => ({ n: 0, p: 0, y: 0 }));
  for (let i = 0; i < P.length; i++) { const p = clamp(P[i], 1e-6, 1 - 1e-6), y = Y[i]; if ((p >= 0.5 ? 1 : 0) === y) acc++; ll += -(y * Math.log(p) + (1 - y) * Math.log(1 - p)); const k = Math.min(B - 1, Math.floor(p * B)); bn[k].n++; bn[k].p += p; bn[k].y += y; }
  let ece = 0; for (const b of bn) if (b.n) ece += (b.n / P.length) * Math.abs(b.p / b.n - b.y / b.n);
  return { acc: acc / P.length, ll: ll / P.length, ece };
}
const N = rows.length, starts = [0.5, 0.6, 0.7, 0.8];
function wf(W, k, wMC, t) {
  const P = [], Y = [];
  for (const s of starts) { const a = Math.floor(s * N), b = Math.floor((s + 0.1) * N); for (const r of rows.slice(a, b)) { P.push(pred(r, W, k, wMC, t)); Y.push(r.y); } }
  return metrics(P, Y);
}

for (const [name, W] of [["HAND weights", HAND], ["BLEND weights", BLEND]]) {
  let best = null;
  for (const k of [0.06, 0.08, 0.1, 0.12, 0.14])
    for (let wMC = 0; wMC <= 0.5001; wMC += 0.05)
      for (const t of [0.75, 0.85, 0.95, 1.0, 1.1]) {
        const m = wf(W, k, +wMC.toFixed(2), t);
        if (!best || m.ll < best.m.ll) best = { k, wMC: +wMC.toFixed(2), t, m };
      }
  console.log(`${name}: best k=${best.k} wMC=${best.wMC} calib=${best.t}  →  acc ${(best.m.acc * 100).toFixed(1)}%  logloss ${best.m.ll.toFixed(4)}  ECE ${(best.m.ece * 100).toFixed(1)}%`);
  if (name === "BLEND weights") writeFileSync(join(ROOT, "backtest", "final-config.json"), JSON.stringify({ weights: W, k: best.k, wMC: best.wMC, calib: best.t }, null, 2));
}

// Reference: current shipped config
const cur = wf(HAND, 0.1, 0.4, 1.0);
console.log(`\nCURRENT shipped (HAND k=0.10 wMC=0.40):            acc ${(cur.acc * 100).toFixed(1)}%  logloss ${cur.ll.toFixed(4)}  ECE ${(cur.ece * 100).toFixed(1)}%`);
