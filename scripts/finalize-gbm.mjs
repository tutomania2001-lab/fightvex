// Train the FINAL GBM on all data, export compact trees to gbm.generated.ts,
// and compute the deployed ensemble's honest OUT-OF-SAMPLE metrics (walk-forward
// pooled over the most recent 60%) for the public backtest artifact.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { rows, cats, eng } = JSON.parse(readFileSync(join(ROOT, "backtest", "features2.json"), "utf8"));
rows.sort((a, b) => new Date(a.date) - new Date(b.date));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), sig = (z) => 1 / (1 + Math.exp(-z)), logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));
const FEATS = [...cats.map((c) => "d_" + c), ...eng, "mcLogit", "gap"];
const X = rows.map((r) => [...r.diff, ...r.efeat, logit(r.mc), r.gap]);
const Y = rows.map((r) => r.y);
const shrinkOf = (r) => (1 - r.comp) * 0.3 + (r.variance === "HIGH" ? 0.1 : r.variance === "MEDIUM" ? 0.05 : 0);
const enginePred = (r) => { let p = 0.15 * r.mc + 0.85 * sig(0.14 * r.gap); p = 0.5 + (p - 0.5) * (1 - shrinkOf(r)); return clamp(p, 0.07, 0.93); };

function quantiles(col, bins = 24) { const s = col.slice().sort((a, b) => a - b), q = []; for (let i = 1; i < bins; i++) q.push(s[Math.floor((i / bins) * s.length)]); return [...new Set(q)]; }
function buildTree(idx, X, g, h, thr, depth, lambda, minChild, gamma) {
  let G = 0, H = 0; for (const i of idx) { G += g[i]; H += h[i]; }
  const node = { v: -G / (H + lambda) };
  if (depth === 0 || idx.length < 2 * minChild) return node;
  let best = null;
  for (let f = 0; f < X[0].length; f++) for (const t of thr[f]) {
    let GL = 0, HL = 0, nL = 0; for (const i of idx) if (X[i][f] <= t) { GL += g[i]; HL += h[i]; nL++; }
    const nR = idx.length - nL; if (nL < minChild || nR < minChild) continue;
    const GR = G - GL, HR = H - HL, gain = GL * GL / (HL + lambda) + GR * GR / (HR + lambda) - G * G / (H + lambda) - gamma;
    if (gain > 0 && (!best || gain > best.gain)) best = { gain, f, t };
  }
  if (!best) return node;
  const L = [], R = []; for (const i of idx) (X[i][best.f] <= best.t ? L : R).push(i);
  return { f: best.f, t: best.t, l: buildTree(L, X, g, h, thr, depth - 1, lambda, minChild, gamma), r: buildTree(R, X, g, h, thr, depth - 1, lambda, minChild, gamma) };
}
const tp = (n, x) => n.f === undefined ? n.v : tp(x[n.f] <= n.t ? n.l : n.r, x);
function fitGBM(Xtr, Ytr, { trees = 160, depth = 3, lr = 0.06, lambda = 1.5, minChild = 24, gamma = 0.5 } = {}) {
  const n = Xtr.length, thr = []; for (let f = 0; f < Xtr[0].length; f++) thr.push(quantiles(Xtr.map((x) => x[f])));
  const base = logit(clamp(Ytr.reduce((a, b) => a + b, 0) / n, 0.02, 0.98)), F = new Array(n).fill(base), models = [];
  for (let t = 0; t < trees; t++) {
    const g = new Array(n), h = new Array(n);
    for (let i = 0; i < n; i++) { const p = sig(F[i]); g[i] = p - Ytr[i]; h[i] = Math.max(p * (1 - p), 1e-6); }
    const tree = buildTree([...Array(n).keys()], Xtr, g, h, thr, depth, lambda, minChild, gamma);
    for (let i = 0; i < n; i++) F[i] += lr * tp(tree, Xtr[i]); models.push(tree);
  }
  return { base, lr, models, predict: (x) => sig(base + lr * models.reduce((s, m) => s + tp(m, x), 0)) };
}

// ---- honest out-of-sample artifact metrics (walk-forward, most recent 60%) ----
const N = rows.length, starts = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const P = [], Yt = [], dates = [];
for (const s of starts) {
  const a = Math.floor(s * N), b = Math.min(N, Math.floor((s + 0.1) * N));
  const m = fitGBM(X.slice(0, a), Y.slice(0, a));
  for (let i = a; i < b; i++) { P.push(clamp(0.5 * enginePred(rows[i]) + 0.5 * clamp(m.predict(X[i]), 0.05, 0.95), 0.05, 0.95)); Yt.push(Y[i]); dates.push(rows[i].date); }
}
function metr(P, Y) {
  let acc = 0, ll = 0, br = 0; const B = 10, bn = Array.from({ length: B }, () => ({ n: 0, p: 0, y: 0 }));
  for (let i = 0; i < P.length; i++) { const p = clamp(P[i], 1e-6, 1 - 1e-6), y = Y[i]; if ((p >= 0.5 ? 1 : 0) === y) acc++; ll -= y * Math.log(p) + (1 - y) * Math.log(1 - p); br += (p - y) ** 2; const k = Math.min(B - 1, Math.floor(p * B)); bn[k].n++; bn[k].p += p; bn[k].y += y; }
  return { acc: acc / P.length, ll: ll / P.length, br: br / P.length, cal: bn.map((b, i) => ({ bucket: `${i / 10}-${(i + 1) / 10}`, n: b.n, predicted: b.n ? b.p / b.n : 0, actual: b.n ? b.y / b.n : 0 })).filter((c) => c.n >= 10), n: P.length };
}
const full = metr(P, Yt);
const cut = Math.floor(P.length * 0.7);
const recent = metr(P.slice(cut), Yt.slice(cut));
console.log(`Ensemble OUT-OF-SAMPLE (walk-forward pooled, n=${full.n}): acc ${(full.acc * 100).toFixed(1)}%  logloss ${full.ll.toFixed(4)}  brier ${full.br.toFixed(4)}`);
console.log(`Recent third: acc ${(recent.acc * 100).toFixed(1)}%  logloss ${recent.ll.toFixed(4)}`);

// ---- train final on ALL data, export ----
const finalM = fitGBM(X, Y);
const treeJSON = JSON.stringify(finalM.models);
writeFileSync(join(ROOT, "src", "lib", "data", "gbm.generated.ts"),
`// AUTO-GENERATED by scripts/finalize-gbm.mjs — gradient-boosted trees (XGBoost-
// style) trained on ${N} leakage-free historical bouts. Blended 50/50 with the
// transparent engine. Feature order is FEATS. DO NOT EDIT BY HAND.
/* eslint-disable */
export type GbmNode = { v: number } | { f: number; t: number; l: GbmNode; r: GbmNode };
export const GBM_FEATS: string[] = ${JSON.stringify(FEATS)};
export const GBM_BASE = ${finalM.base};
export const GBM_LR = ${finalM.lr};
export const GBM_TREES: GbmNode[] = ${treeJSON};
`);
writeFileSync(join(ROOT, "backtest", "artifact-numbers.json"), JSON.stringify({ accuracy: +full.acc.toFixed(3), accuracyRecent: +recent.acc.toFixed(3), logLoss: +full.ll.toFixed(3), logLossRecent: +recent.ll.toFixed(3), brier: +full.br.toFixed(3), calibration: full.cal.map((c) => ({ bucket: c.bucket, predicted: +c.predicted.toFixed(3), actual: +c.actual.toFixed(3), n: c.n })) }, null, 2));
console.log(`→ wrote src/lib/data/gbm.generated.ts (${finalM.models.length} trees) + backtest/artifact-numbers.json`);
