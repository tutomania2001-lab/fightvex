// ============================================================
// FightVex — gradient-boosted ensemble layer.
// Evaluates the trained GBM (gbm.generated.ts) on a matchup's feature vector and
// returns its win probability for fighter A. sim.ts blends this 50/50 with the
// transparent rating+simulation model — a combo that, on a leakage-free
// walk-forward backtest of 3,289 real bouts, beat the transparent model alone on
// BOTH accuracy and log-loss (bootstrap-significant). The transparent model
// still drives the radar, method/round breakdown and explanations.
// ============================================================
import type { Fighter } from "./types";
import { GBM_TREES, GBM_BASE, GBM_LR, type GbmNode } from "./data/gbm.generated";
import { formFor } from "./data/form.generated";

// Feature order MUST match scripts/features2.mjs / finalize-gbm.mjs exactly.
const CATS = ["Striking", "Wrestling", "Grappling", "Cardio", "Durability", "Form", "Competition", "Submission", "Physical"];
const south = (s: string) => /southpaw/i.test(s || "");
const evalNode = (n: GbmNode, x: number[]): number => ("v" in n ? n.v : evalNode(x[n.f] <= n.t ? n.l : n.r, x));
const logit = (p: number) => { const q = Math.min(1 - 1e-6, Math.max(1e-6, p)); return Math.log(q / (1 - q)); };

export function gbmProbA(
  a: Fighter, b: Fighter,
  subA: Record<string, number>, subB: Record<string, number>,
  mcProbA: number, rA: number, rB: number,
): number {
  const fa = formFor(a.id), fb = formFor(b.id);
  const totA = a.record.wins + a.record.losses + a.record.draws;
  const totB = b.record.wins + b.record.losses + b.record.draws;
  const x = [
    ...CATS.map((c) => subA[c] - subB[c]),                 // 9 sub-score diffs
    fa.recForm - fb.recForm, fa.streak - fb.streak, fa.activity - fb.activity,
    fa.recFinish - fb.recFinish, fa.avgDur - fb.avgDur,    // recent-form diffs
    Math.max(0, a.age - 33) - Math.max(0, b.age - 33),     // age decline
    a.reachCm - b.reachCm, south(a.stance) !== south(b.stance) ? 1 : 0,
    a.age - b.age, totA - totB,                            // age, experience
    logit(mcProbA), rA - rB,                               // engine signals
  ];
  let F = GBM_BASE;
  for (const t of GBM_TREES) F += GBM_LR * evalNode(t, x);
  return 1 / (1 + Math.exp(-F));
}
