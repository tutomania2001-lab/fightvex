// ============================================================
// FightVex — model optimization & rigorous validation.
// Reads backtest/features.json (point-in-time, leakage-free, symmetrized) and:
//   • walk-forward time CV (train on the past, test on the future, 4 folds)
//   • baselines (record, rating-gap, Monte-Carlo)
//   • the CURRENT engine (hand weights, k=0.10, wMC=0.40, shrink)
//   • data-fitted prior (non-negative L2 logistic on the 9 sub-score diffs)
//   • optimal blend of fitted-prior + MC, + global calibration
// Reports acc / log-loss / Brier / ECE for each, pooled over the held-out
// folds, and prints the deployable transparent config.
//
// Run:  node scripts/optimize.mjs
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { cats, rows } = JSON.parse(readFileSync(join(ROOT, "backtest", "features.json"), "utf8"));
rows.sort((a, b) => new Date(a.date) - new Date(b.date));

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sig = (z) => 1 / (1 + Math.exp(-z));
const logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));
const D = cats.length;

// ---- metrics ----
function metrics(preds, ys) {
  let acc = 0, ll = 0, br = 0;
  const B = 10, bn = Array.from({ length: B }, () => ({ n: 0, p: 0, y: 0 }));
  for (let i = 0; i < preds.length; i++) {
    const p = clamp(preds[i], 1e-6, 1 - 1e-6), y = ys[i];
    if ((p >= 0.5 ? 1 : 0) === y) acc++;
    ll += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    br += (p - y) ** 2;
    const k = Math.min(B - 1, Math.floor(p * B)); bn[k].n++; bn[k].p += p; bn[k].y += y;
  }
  let ece = 0; const n = preds.length;
  for (const b of bn) if (b.n) ece += (b.n / n) * Math.abs(b.p / b.n - b.y / b.n);
  return { acc: acc / n, ll: ll / n, br: br / n, ece, n };
}

// ---- non-negative L2 logistic (projected gradient) on standardized features ----
function standardizer(X) {
  const d = X[0].length, mean = new Array(d).fill(0), std = new Array(d).fill(0);
  for (const x of X) for (let j = 0; j < d; j++) mean[j] += x[j];
  for (let j = 0; j < d; j++) mean[j] /= X.length;
  for (const x of X) for (let j = 0; j < d; j++) std[j] += (x[j] - mean[j]) ** 2;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / X.length) || 1;
  return { mean, std, tx: (x) => x.map((v, j) => (v - mean[j]) / std[j]) };
}
function fitLogistic(X, y, { l2 = 1.0, iters = 600, lr = 0.4, nonneg = null } = {}) {
  const n = X.length, d = X[0].length;
  let w = new Array(d).fill(0), b = 0;
  for (let it = 0; it < iters; it++) {
    const gw = new Array(d).fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b; for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const e = sig(z) - y[i]; gb += e;
      for (let j = 0; j < d; j++) gw[j] += e * X[i][j];
    }
    b -= lr * gb / n;
    for (let j = 0; j < d; j++) { w[j] -= lr * (gw[j] / n + l2 * w[j]); if (nonneg && nonneg[j] && w[j] < 0) w[j] = 0; }
  }
  return { w, b };
}

// ---- engine reproduction from features ----
const shrinkOf = (r) => (1 - r.comp) * 0.3 + (r.variance === "HIGH" ? 0.1 : r.variance === "MEDIUM" ? 0.05 : 0);
function enginePred(r, k = 0.1, wMC = 0.4) {
  const prior = sig(k * r.gap);
  let p = wMC * r.mc + (1 - wMC) * prior;
  p = 0.5 + (p - 0.5) * (1 - shrinkOf(r));
  return clamp(p, 0.07, 0.93);
}

// ---- walk-forward folds: train on the past, test on the next 10% block ----
const N = rows.length;
const starts = [0.5, 0.6, 0.7, 0.8];
function walkForward(predictFactory) {
  const preds = [], ys = [];
  for (const s of starts) {
    const a = Math.floor(s * N), b = Math.floor((s + 0.1) * N);
    const train = rows.slice(0, a), test = rows.slice(a, b);
    const predict = predictFactory(train);
    for (const r of test) { preds.push(predict(r)); ys.push(r.y); }
  }
  return { preds, ys, m: metrics(preds, ys) };
}
const show = (name, m) => console.log(`${name.padEnd(34)} acc ${(m.acc * 100).toFixed(1)}%  logloss ${m.ll.toFixed(4)}  brier ${m.br.toFixed(4)}  ECE ${(m.ece * 100).toFixed(1)}%  (n=${m.n})`);

console.log(`Pooled held-out (walk-forward, 4 folds over the most recent ~40%):\n`);

// Baselines
show("Baseline: pick higher win%", walkForward(() => (r) => r.wrDiff >= 0 ? 0.6 : 0.4).m);
show("Baseline: rating-gap sign", walkForward(() => (r) => sig(0.1 * r.gap)).m);
show("Baseline: Monte-Carlo only", walkForward(() => (r) => clamp(r.mc, 0.07, 0.93)).m);

// Current engine
show("CURRENT engine (k.10/wMC.40)", walkForward(() => (r) => enginePred(r, 0.1, 0.4)).m);

// Fitted prior (non-negative on the 9 diffs)
const nonnegMask = new Array(D).fill(true);
function fittedPriorFactory(train) {
  const X = train.map((r) => r.diff), y = train.map((r) => r.y);
  const st = standardizer(X);
  const { w, b } = fitLogistic(X.map(st.tx), y, { l2: 1.5, nonneg: nonnegMask });
  return (r) => clamp(sig(b + st.tx(r.diff).reduce((s, v, j) => s + w[j] * v, 0)), 0.07, 0.93);
}
show("Fitted prior (diffs only)", walkForward(fittedPriorFactory).m);

// Fitted prior + MC blend (blend weight chosen on train by log-loss)
function fittedBlendFactory(train) {
  const X = train.map((r) => r.diff), y = train.map((r) => r.y);
  const st = standardizer(X);
  const { w, b } = fitLogistic(X.map(st.tx), y, { l2: 1.5, nonneg: nonnegMask });
  const prior = (r) => sig(b + st.tx(r.diff).reduce((s, v, j) => s + w[j] * v, 0));
  // choose blend on train
  let bestA = 0.5, bestLL = Infinity;
  for (let aMc = 0; aMc <= 1.0001; aMc += 0.05) {
    let ll = 0; for (const r of train) { const p = clamp(aMc * r.mc + (1 - aMc) * prior(r), 1e-6, 1 - 1e-6); ll += -(r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); }
    if (ll / train.length < bestLL) { bestLL = ll / train.length; bestA = +aMc.toFixed(2); }
  }
  return (r) => clamp(bestA * r.mc + (1 - bestA) * prior(r), 0.07, 0.93);
}
const blend = walkForward(fittedBlendFactory);
show("Fitted prior + MC blend", blend.m);

// Joint logistic (diffs + logit(mc)); mc weight free, diffs non-negative
function jointFactory(train) {
  const X = train.map((r) => [...r.diff, logit(r.mc)]), y = train.map((r) => r.y);
  const st = standardizer(X);
  const mask = [...nonnegMask, false];
  const { w, b } = fitLogistic(X.map(st.tx), y, { l2: 1.0, nonneg: mask });
  return (r) => clamp(sig(b + st.tx([...r.diff, logit(r.mc)]).reduce((s, v, j) => s + w[j] * v, 0)), 0.07, 0.93);
}
const joint = walkForward(jointFactory);
show("Joint logistic (diffs + MC)", joint.m);

// Calibration temperature on the joint model (fit per train fold)
function jointCalibratedFactory(train) {
  const base = jointFactory(train);
  let t = 1, bestLL = Infinity;
  for (let tt = 0.5; tt <= 1.3; tt += 0.05) {
    let ll = 0; for (const r of train) { const p = clamp(sig(logit(base(r)) * tt), 1e-6, 1 - 1e-6); ll += -(r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); }
    if (ll / train.length < bestLL) { bestLL = ll / train.length; t = +tt.toFixed(2); }
  }
  return (r) => clamp(sig(logit(base(r)) * t), 0.07, 0.93);
}
show("Joint + calibration", walkForward(jointCalibratedFactory).m);

// ---- Fit the FINAL deployable transparent config on ALL data ----
console.log(`\n--- Deployable config (fit on all ${N} rows) ---`);
const X = rows.map((r) => r.diff), y = rows.map((r) => r.y);
const st = standardizer(X);
const { w, b } = fitLogistic(X.map(st.tx), y, { l2: 1.5, nonneg: nonnegMask });
// Convert standardized weights back to RAW per-diff coefficients: contribution
// β_raw_j = w_j / std_j; intercept folds in the means.
const betaRaw = w.map((wj, j) => wj / st.std[j]);
const intercept = b - w.reduce((s, wj, j) => s + wj * st.mean[j] / st.std[j], 0);
// Normalize to published WEIGHTS (sum=1, non-negative) + a slope k so that
// k * Σ WEIGHTS_c*diff_c == Σ betaRaw_c*diff_c.
const kEff = betaRaw.reduce((s, v) => s + v, 0);
const weights = Object.fromEntries(cats.map((c, j) => [c, +(betaRaw[j] / kEff).toFixed(4)]));
// best blend on all data
let bestA = 0.4, bestLL = Infinity;
const prior = (r) => sig(intercept + betaRaw.reduce((s, v, j) => s + v * r.diff[j], 0));
for (let aMc = 0; aMc <= 1.0001; aMc += 0.05) {
  let ll = 0; for (const r of rows) { const p = clamp(aMc * r.mc + (1 - aMc) * prior(r), 1e-6, 1 - 1e-6); ll += -(r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); }
  if (ll / rows.length < bestLL) { bestLL = ll / rows.length; bestA = +aMc.toFixed(2); }
}
console.log("k (effective slope):", kEff.toFixed(4));
console.log("intercept:", intercept.toFixed(4), "(≈0 expected, symmetrized)");
console.log("blend wMC:", bestA);
console.log("WEIGHTS (data-fitted, sum=1):");
for (const [c, v] of Object.entries(weights).sort((a, b2) => b2[1] - a[1])) console.log(`  ${c.padEnd(12)} ${(v * 100).toFixed(1)}%`);
writeFileSync(join(ROOT, "backtest", "optimized.json"), JSON.stringify({ weights, k: +kEff.toFixed(4), intercept: +intercept.toFixed(4), wMC: bestA }, null, 2));
console.log("\n→ wrote backtest/optimized.json");
