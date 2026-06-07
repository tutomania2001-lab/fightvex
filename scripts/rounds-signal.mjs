// ============================================================
// FightVex — does UFCStats target/position DETAIL add predictive signal?
// Self-contained leakage-free test on the crawled detail set: build point-in-
// time per-fighter profiles, then A/B a walk-forward GBM WITH vs WITHOUT the
// detail features (head/body/leg %, distance/clinch/ground %). DETAIL=off → baseline.
// Run: node scripts/rounds-signal.mjs  (and DETAIL=off node scripts/rounds-signal.mjs)
// ============================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { fights } = JSON.parse(readFileSync(join(ROOT, "backtest", "ufcstats-detail.json"), "utf8"));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), sig = (z) => 1 / (1 + Math.exp(-z)), logit = (p) => Math.log(clamp(p, 1e-6, 1 - 1e-6) / (1 - clamp(p, 1e-6, 1 - 1e-6)));
const USE_DETAIL = process.env.DETAIL !== "off";
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const valid = fights.filter((f) => f.date && f.a?.name && f.b?.name && f.a.head != null).map((f) => ({ ...f, t: new Date(f.date).getTime() })).filter((f) => !isNaN(f.t)).sort((a, b) => a.t - b.t);

const hist = new Map();       // name -> prior fight detail list
const elo = new Map();        // name -> rating
const getElo = (n) => elo.get(n) ?? 1500;
function profile(name) {
  const h = hist.get(name) || [];
  const n = h.length;
  if (!n) return null;
  const sum = (k) => h.reduce((s, x) => s + x[k], 0);
  const sigT = sum("head") + sum("body") + sum("leg"), posT = sum("distance") + sum("clinch") + sum("ground");
  return {
    n, avgSig: sum("sigL") / n, avgTD: sum("td") / n, avgKD: sum("kd") / n, avgSub: sum("subAtt") / n, avgCtrl: sum("ctrlSec") / n / 60,
    winrate: sum("won") / n, elo: getElo(name),
    head: sigT ? sum("head") / sigT : 0.6, body: sigT ? sum("body") / sigT : 0.2, leg: sigT ? sum("leg") / sigT : 0.2,
    distance: posT ? sum("distance") / posT : 0.8, clinch: posT ? sum("clinch") / posT : 0.1, ground: posT ? sum("ground") / posT : 0.1,
  };
}

const rows = [];
for (const f of valid) {
  const na = norm(f.a.name), nb = norm(f.b.name);
  const pa = profile(na), pb = profile(nb);
  if (pa && pb && pa.n >= 2 && pb.n >= 2) {
    const swap = hash(na + nb) & 1;
    const [A, B, P, Q, win] = swap ? [f.b, f.a, pb, pa, f.b.win] : [f.a, f.b, pa, pb, f.a.win];
    const base = [P.avgSig - Q.avgSig, P.avgTD - Q.avgTD, P.avgKD - Q.avgKD, P.avgSub - Q.avgSub, P.avgCtrl - Q.avgCtrl, P.winrate - Q.winrate, (P.elo - Q.elo) / 100];
    const detail = [P.head - Q.head, P.body - Q.body, P.leg - Q.leg, P.distance - Q.distance, P.clinch - Q.clinch, P.ground - Q.ground];
    rows.push({ t: f.t, x: USE_DETAIL ? [...base, ...detail] : base, y: win ? 1 : 0 });
  }
  // update history + elo (after building features = no leakage)
  const sA = f.a.win ? 1 : f.b.win ? 0 : 0.5;
  const eA = getElo(na), eB = getElo(nb), expA = 1 / (1 + 10 ** ((eB - eA) / 400));
  elo.set(na, eA + 32 * (sA - expA)); elo.set(nb, eB + 32 * ((1 - sA) - (1 - expA)));
  for (const [n, side] of [[na, f.a], [nb, f.b]]) { if (!hist.has(n)) hist.set(n, []); hist.get(n).push({ ...side, won: side.win ? 1 : 0 }); }
}

// ---- compact GBM (matches scripts/gbm.mjs) ----
function quant(col, b = 24) { const s = col.slice().sort((x, y) => x - y), q = []; for (let i = 1; i < b; i++) q.push(s[Math.floor(i / b * s.length)]); return [...new Set(q)]; }
function tree(idx, X, g, h, thr, d, lam = 1.5, mc = 24, gam = 0.5) {
  let G = 0, H = 0; for (const i of idx) { G += g[i]; H += h[i]; } const node = { v: -G / (H + lam) };
  if (d === 0 || idx.length < 2 * mc) return node; let best = null;
  for (let f = 0; f < X[0].length; f++) for (const t of thr[f]) { let GL = 0, HL = 0, nL = 0; for (const i of idx) if (X[i][f] <= t) { GL += g[i]; HL += h[i]; nL++; } const nR = idx.length - nL; if (nL < mc || nR < mc) continue; const GR = G - GL, HR = H - HL, gain = GL * GL / (HL + lam) + GR * GR / (HR + lam) - G * G / (H + lam) - gam; if (gain > 0 && (!best || gain > best.gain)) best = { gain, f, t }; }
  if (!best) return node; const L = [], R = []; for (const i of idx) (X[i][best.f] <= best.t ? L : R).push(i);
  return { f: best.f, t: best.t, l: tree(L, X, g, h, thr, d - 1), r: tree(R, X, g, h, thr, d - 1) };
}
const tp = (n, x) => n.f === undefined ? n.v : tp(x[n.f] <= n.t ? n.l : n.r, x);
function fit(X, Y, trees = 140, lr = 0.06, depth = 3) {
  const n = X.length, thr = []; for (let f = 0; f < X[0].length; f++) thr.push(quant(X.map((x) => x[f])));
  const base = logit(clamp(Y.reduce((a, b) => a + b, 0) / n, .02, .98)), F = new Array(n).fill(base), M = [];
  for (let t = 0; t < trees; t++) { const g = new Array(n), h = new Array(n); for (let i = 0; i < n; i++) { const p = sig(F[i]); g[i] = p - Y[i]; h[i] = Math.max(p * (1 - p), 1e-6); } const tr = tree([...Array(n).keys()], X, g, h, thr, depth); for (let i = 0; i < n; i++) F[i] += lr * tp(tr, X[i]); M.push(tr); }
  return (x) => sig(base + lr * M.reduce((s, m) => s + tp(m, x), 0));
}

const N = rows.length, X = rows.map((r) => r.x), Y = rows.map((r) => r.y);
let acc = 0, ll = 0, nn = 0;
for (const s of [0.5, 0.6, 0.7, 0.8]) {
  const a = Math.floor(s * N), b = Math.floor((s + 0.1) * N);
  const pred = fit(X.slice(0, a), Y.slice(0, a));
  for (let i = a; i < b; i++) { const p = clamp(pred(X[i]), .05, .95); if ((p >= .5 ? 1 : 0) === Y[i]) acc++; ll -= Y[i] * Math.log(p) + (1 - Y[i]) * Math.log(1 - p); nn++; }
}
console.log(`DETAIL ${USE_DETAIL ? "ON " : "OFF"} | rows ${N} (feat ${X[0].length}) | held-out n=${nn}  acc ${(acc / nn * 100).toFixed(1)}%  logloss ${(ll / nn).toFixed(4)}`);
