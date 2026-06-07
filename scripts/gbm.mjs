// ============================================================
// FightVex — gradient-boosted trees (XGBoost-style) vs the engine + logistic,
// walk-forward validated, ensembled, with bootstrap confidence intervals so we
// know which differences are REAL and not noise.
//
// Run:  node scripts/gbm.mjs
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { rows } = JSON.parse(readFileSync(join(ROOT, "backtest", "features2.json"), "utf8"));
rows.sort((a, b) => new Date(a.date) - new Date(b.date));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), sig = (z) => 1 / (1 + Math.exp(-z)), logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));

// feature vector: 9 subscore diffs + 10 engineered + mc(logit) + rating gap
// engineered idx: 9 recForm,10 streak,11 activity,12 recFinish,13 avgDur,
//                 14 ageDecline,15 reach,16 stanceMis,17 age,18 exp; 19 mc,20 gap
// STYLE / BEH / ELO = off → exclude those feature groups (A/B). Default: include.
const useStyle = process.env.STYLE !== "off" && rows[0].style;
const useBeh = process.env.BEH !== "off" && rows[0].beh;
const useElo = process.env.ELO !== "off" && rows[0].elo;
let X = rows.map((r) => [...r.diff, ...r.efeat, logit(r.mc), r.gap, ...(useStyle ? r.style : []), ...(useBeh ? r.beh : []), ...(useElo ? r.elo : [])]);
const Y = rows.map((r) => r.y);
console.log(`Style: ${useStyle ? "ON" : "off"} · Behavioral: ${useBeh ? "ON" : "off"} · Elo: ${useElo ? "ON (+" + rows[0].elo.length + ")" : "off"}`);
// FEATS=prod → only features computable from the live Fighter object (drops the
// recent-fight-sequence features 9–13 we don't yet have in production data).
const KEEP = process.env.FEATS === "prod"
  ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 20]
  : [...Array(X[0].length).keys()];
X = X.map((x) => KEEP.map((j) => x[j]));
const D = X[0].length;
console.log(`Feature set: ${process.env.FEATS === "prod" ? "PRODUCTION-AVAILABLE" : "FULL"} (${D} features)`);
const shrinkOf = (r) => (1 - r.comp) * 0.3 + (r.variance === "HIGH" ? 0.1 : r.variance === "MEDIUM" ? 0.05 : 0);
const enginePred = (r) => { let p = 0.15 * r.mc + 0.85 * sig(0.14 * r.gap); p = 0.5 + (p - 0.5) * (1 - shrinkOf(r)); return clamp(p, 0.07, 0.93); };

// ---- metrics ----
function metrics(P, Yt) {
  let acc = 0, ll = 0, br = 0; const B = 10, bn = Array.from({ length: B }, () => ({ n: 0, p: 0, y: 0 }));
  for (let i = 0; i < P.length; i++) { const p = clamp(P[i], 1e-6, 1 - 1e-6), y = Yt[i]; if ((p >= 0.5 ? 1 : 0) === y) acc++; ll -= y * Math.log(p) + (1 - y) * Math.log(1 - p); br += (p - y) ** 2; const k = Math.min(B - 1, Math.floor(p * B)); bn[k].n++; bn[k].p += p; bn[k].y += y; }
  let ece = 0; for (const b of bn) if (b.n) ece += (b.n / P.length) * Math.abs(b.p / b.n - b.y / b.n);
  return { acc: acc / P.length, ll: ll / P.length, br: br / P.length, ece };
}

// ---- XGBoost-style regression tree on (grad, hess) ----
function quantiles(col, bins = 24) {
  const s = col.slice().sort((a, b) => a - b), q = [];
  for (let i = 1; i < bins; i++) q.push(s[Math.floor((i / bins) * s.length)]);
  return [...new Set(q)];
}
function buildTree(idx, X, g, h, thresholds, depth, lambda, minChild, gamma) {
  const node = {};
  let G = 0, H = 0; for (const i of idx) { G += g[i]; H += h[i]; }
  node.leaf = -G / (H + lambda);
  if (depth === 0 || idx.length < 2 * minChild) return node;
  let best = null;
  for (let f = 0; f < X[0].length; f++) {
    for (const thr of thresholds[f]) {
      let GL = 0, HL = 0, nL = 0;
      for (const i of idx) if (X[i][f] <= thr) { GL += g[i]; HL += h[i]; nL++; }
      const nR = idx.length - nL; if (nL < minChild || nR < minChild) continue;
      const GR = G - GL, HR = H - HL;
      const gain = GL * GL / (HL + lambda) + GR * GR / (HR + lambda) - G * G / (H + lambda) - gamma;
      if (gain > 0 && (!best || gain > best.gain)) best = { gain, f, thr };
    }
  }
  if (!best) return node;
  const L = [], R = [];
  for (const i of idx) (X[i][best.f] <= best.thr ? L : R).push(i);
  node.f = best.f; node.thr = best.thr;
  node.L = buildTree(L, X, g, h, thresholds, depth - 1, lambda, minChild, gamma);
  node.R = buildTree(R, X, g, h, thresholds, depth - 1, lambda, minChild, gamma);
  return node;
}
const treePred = (node, x) => node.f === undefined ? node.leaf : treePred(x[node.f] <= node.thr ? node.L : node.R, x);

function fitGBM(Xtr, Ytr, { trees = 160, depth = 3, lr = 0.06, lambda = 1.5, minChild = 24, gamma = 0.5, base = 0 } = {}) {
  const n = Xtr.length, thresholds = [];
  for (let f = 0; f < Xtr[0].length; f++) thresholds.push(quantiles(Xtr.map((x) => x[f])));
  const F = new Array(n).fill(base), models = [];
  for (let t = 0; t < trees; t++) {
    const g = new Array(n), h = new Array(n);
    for (let i = 0; i < n; i++) { const p = sig(F[i]); g[i] = p - Ytr[i]; h[i] = Math.max(p * (1 - p), 1e-6); }
    const tree = buildTree([...Array(n).keys()], Xtr, g, h, thresholds, depth, lambda, minChild, gamma);
    for (let i = 0; i < n; i++) F[i] += lr * treePred(tree, Xtr[i]);
    models.push(tree);
  }
  return { base, lr, predict: (x) => sig(base + lr * models.reduce((s, m) => s + treePred(m, x), 0)) };
}

// ---- walk-forward ----
const N = rows.length, starts = [0.5, 0.6, 0.7, 0.8];
function walk() {
  const out = { engine: [], gbm: [], ens: [], y: [] };
  for (const s of starts) {
    const a = Math.floor(s * N), b = Math.floor((s + 0.1) * N);
    const Xtr = X.slice(0, a), Ytr = Y.slice(0, a);
    const base = logit(clamp(Ytr.reduce((p, q) => p + q, 0) / Ytr.length, 0.02, 0.98));
    const gbm = fitGBM(Xtr, Ytr, { base });
    for (let i = a; i < b; i++) {
      const e = enginePred(rows[i]), g = clamp(gbm.predict(X[i]), 0.05, 0.95);
      out.engine.push(e); out.gbm.push(g); out.ens.push(0.5 * e + 0.5 * g); out.y.push(Y[i]);
    }
    process.stdout.write(`  fold @${s} done\n`);
  }
  return out;
}
console.log("Training GBM walk-forward (4 folds)…");
const o = walk();
const me = metrics(o.engine, o.y), mg = metrics(o.gbm, o.y), mn = metrics(o.ens, o.y);
const show = (n, m) => console.log(`${n.padEnd(22)} acc ${(m.acc * 100).toFixed(1)}%  logloss ${m.ll.toFixed(4)}  brier ${m.br.toFixed(4)}  ECE ${(m.ece * 100).toFixed(1)}%`);
console.log(`\nPooled held-out (n=${o.y.length}):`);
show("Engine (deployed)", me); show("GBM", mg); show("Ensemble 50/50", mn);

// ---- paired bootstrap CIs on the differences vs engine ----
function bootDiff(pa, pb, y, reps = 2000) {
  const n = y.length, diffsAcc = [], diffsLL = [];
  const accOf = (P, idx) => { let c = 0; for (const i of idx) if ((P[i] >= 0.5 ? 1 : 0) === y[i]) c++; return c / idx.length; };
  const llOf = (P, idx) => { let s = 0; for (const i of idx) { const p = clamp(P[i], 1e-6, 1 - 1e-6); s -= y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p); } return s / idx.length; };
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let r = 0; r < reps; r++) { const idx = Array.from({ length: n }, () => Math.floor(rnd() * n)); diffsAcc.push(accOf(pb, idx) - accOf(pa, idx)); diffsLL.push(llOf(pb, idx) - llOf(pa, idx)); }
  diffsAcc.sort((a, b) => a - b); diffsLL.sort((a, b) => a - b);
  const ci = (arr) => [arr[Math.floor(0.025 * reps)], arr[Math.floor(0.975 * reps)]];
  return { acc: ci(diffsAcc), ll: ci(diffsLL) };
}
const bg = bootDiff(o.engine, o.gbm, o.y), bn2 = bootDiff(o.engine, o.ens, o.y);
const pctci = (c) => `[${(c[0] * 100).toFixed(1)}, ${(c[1] * 100).toFixed(1)}]pp`;
const llci = (c) => `[${c[0].toFixed(4)}, ${c[1].toFixed(4)}]`;
console.log(`\nBootstrap 95% CI of (model − engine):`);
console.log(`  GBM      acc Δ ${pctci(bg.acc)}   logloss Δ ${llci(bg.ll)}`);
console.log(`  Ensemble acc Δ ${pctci(bn2.acc)}   logloss Δ ${llci(bn2.ll)}`);
console.log(`  (CI excluding 0 ⇒ statistically real at 95%)`);

writeFileSync(join(ROOT, "backtest", "gbm-result.json"), JSON.stringify({ engine: me, gbm: mg, ensemble: mn, ciGBM: bg, ciEns: bn2 }, null, 2));
