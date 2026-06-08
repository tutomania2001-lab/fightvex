"use client";

import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";
import type { Fighter } from "@/lib/types";
import { simulate, type SimParams, type SimResult } from "@/lib/sim";
import { torsoFor } from "@/lib/data/bodies.generated";
import { SimResultView } from "./SimResultView";
import { FighterPicker } from "./FighterPicker";
import { UpgradeGate } from "./UpgradeGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { isShortNotice, missedWeight } from "@/lib/data/context.override";

// Placeholder "Select Fighter" — renders the body silhouette + zeroed stats so
// the simulator shows its UI shell (titles, empty graphs at 0) before a real
// fighter is picked. Free/locked users only ever see this preview.
function blankFighter(side: "A" | "B"): Fighter {
  return {
    id: `__select_${side}`,
    slug: `__select_${side}`,
    name: "Select Fighter",
    country: "",
    flag: "",
    age: 0,
    heightCm: 0,
    reachCm: 0,
    stance: "Orthodox",
    weightClass: "Lightweight",
    image: undefined,
    record: { wins: 0, losses: 0, draws: 0, ko: 0, sub: 0, dec: 0 },
    stats: { slpm: 0, strAcc: 0, sapm: 0, strDef: 0, tdAvg: 0, tdAcc: 0, tdDef: 0, subAvg: 0, ctrl: 0, kdAvg: 0, cardio: 0, durability: 0, finishRate: 0 },
    statsReal: false,
    strengths: [],
    weaknesses: [],
    styleSummary: "",
    oppQuality: 0,
    layoffMonths: 0,
    form: [],
    riskFlags: [],
  };
}
const BLANK_A = blankFighter("A");
const BLANK_B = blankFighter("B");

// A zeroed SimResult — every value 0 / empty so all panels render their titles
// with blank graphs until both fighters are selected (Pro/Elite only).
function blankResult(rounds: number): SimResult {
  const z = Array.from({ length: rounds }, () => 0);
  return {
    probA: 0, probB: 0, ciLow: 0, ciHigh: 0,
    methodA: { ko: 0, sub: 0, dec: 0 }, methodB: { ko: 0, sub: 0, dec: 0 },
    roundMomentum: [...z],
    factors: [],
    dataCompleteness: 0,
    variance: "LOW",
    runs: 0,
    ratingA: 0, ratingB: 0,
    subscoresA: { Striking: 0, Wrestling: 0, Grappling: 0, Submission: 0, Cardio: 0, Durability: 0 },
    subscoresB: { Striking: 0, Wrestling: 0, Grappling: 0, Submission: 0, Cardio: 0, Durability: 0 },
    headline: { winnerSide: "A", method: "Decision", confidence: 0 },
    roundDist: { aFinish: [...z], bFinish: [...z], aDec: 0, bDec: 0 },
  };
}

export function Simulator({
  fighters,
  initialA,
  initialB,
}: {
  fighters: Fighter[];
  initialA?: string;
  initialB?: string;
}) {
  // No fighters preselected — the simulator opens on the silhouette/select state.
  const [aId, setAId] = useState<string | null>(initialA ?? null);
  const [bId, setBId] = useState<string | null>(initialB ?? null);
  const [rounds, setRounds] = useState<3 | 5>(3);
  const [snA, setSnA] = useState(false);
  const [snB, setSnB] = useState(false);
  const [runs, setRuns] = useState(50000);
  const [nonce, setNonce] = useState(0);
  const [picking, setPicking] = useState<"A" | "B" | null>(null);
  const [gated, setGated] = useState(false);

  // When a known short-notice fighter is selected, default their short-notice
  // toggle ON so the simulator matches the auto-pick (the user can still toggle).
  useEffect(() => { setSnA(isShortNotice(aId ?? undefined)); }, [aId]);
  useEffect(() => { setSnB(isShortNotice(bId ?? undefined)); }, [bId]);

  // Running a real simulation (selecting fighters, changing params, re-running)
  // is a paid feature. Free + logged-out users ONLY ever see the silhouette
  // preview — never an actual fight — and get an upgrade prompt on any control.
  const { user } = useAuth();
  const canSimulate = user?.plan === "pro" || user?.plan === "elite";

  // Wraps a control handler: blocks + prompts when the user can't simulate.
  function guard<A extends unknown[]>(fn: (...args: A) => void) {
    return (...args: A) => {
      if (!canSimulate) {
        setGated(true);
        return;
      }
      fn(...args);
    };
  }

  // Pool of real fighters that have a full-body shot — used as the "Select
  // Fighter" silhouettes (rendered solid black). Deterministic initial pick
  // (stable for SSR), then randomized on mount for variety.
  const bodyPool = useMemo(() => fighters.filter((f) => torsoFor(f.slug)), [fighters]);
  const [phA, setPhA] = useState<Fighter | undefined>(() => bodyPool[0]);
  const [phB, setPhB] = useState<Fighter | undefined>(() => bodyPool[1]);
  useEffect(() => {
    if (bodyPool.length < 2) return;
    const i = Math.floor(Math.random() * bodyPool.length);
    let j = Math.floor(Math.random() * bodyPool.length);
    if (j === i) j = (j + 1) % bodyPool.length;
    // One-time randomization on mount (stable for SSR, varied on the client).
    /* eslint-disable react-hooks/set-state-in-effect */
    setPhA(bodyPool[i]);
    setPhB(bodyPool[j]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [bodyPool]);

  // Real fighters only for Pro/Elite; otherwise the "Select Fighter" silhouettes
  // (a random real fighter's body shape, slug only — name/stats stay blank/0).
  const realA = canSimulate && aId ? fighters.find((f) => f.id === aId) : undefined;
  const realB = canSimulate && bId ? fighters.find((f) => f.id === bId) : undefined;
  const a = realA ?? { ...BLANK_A, slug: phA?.slug ?? BLANK_A.slug };
  const b = realB ?? { ...BLANK_B, slug: phB?.slug ?? BLANK_B.slug };

  const result = useMemo(() => {
    if (!realA || !realB) return blankResult(rounds); // empty zeroed preview
    const params: SimParams = { rounds, shortNoticeA: snA, shortNoticeB: snB, missedWeightA: missedWeight(aId ?? undefined), missedWeightB: missedWeight(bId ?? undefined), runs: runs + nonce * 7 };
    return simulate(realA, realB, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aId, bId, rounds, snA, snB, runs, nonce, canSimulate]);

  // Funnel analytics: one event per matchup actually simulated (Pro users).
  useEffect(() => {
    if (canSimulate && realA && realB) {
      try { posthog.capture("simulation_run", { rounds }); } catch { /* best-effort analytics */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aId, bId, canSimulate]);

  return (
    <div className="space-y-5">
      {/* Control bar — luxury-minimal glass buttons with the red/blue corner flare. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Rounds</span>
          {[3, 5].map((r) => (
            <button
              key={r}
              onClick={guard(() => setRounds(r as 3 | 5))}
              aria-pressed={rounds === r}
              className={`btn-toggle rounded-md px-3.5 py-1.5 text-sm font-semibold uppercase tracking-wide ${rounds === r ? "is-on" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={guard(() => setSnA(!snA))}
          aria-pressed={snA}
          className={`btn-toggle rounded-md px-3.5 py-1.5 text-sm font-semibold uppercase tracking-wide ${snA ? "is-on" : ""}`}
        >
          A short-notice
        </button>
        <button
          onClick={guard(() => setSnB(!snB))}
          aria-pressed={snB}
          className={`btn-toggle rounded-md px-3.5 py-1.5 text-sm font-semibold uppercase tracking-wide ${snB ? "is-on" : ""}`}
        >
          B short-notice
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Runs</span>
          {[50000].map((r) => (
            <button
              key={r}
              onClick={guard(() => setRuns(r))}
              aria-pressed={runs === r}
              className={`btn-toggle rounded-md px-3.5 py-1.5 text-sm font-semibold uppercase tracking-wide ${runs === r ? "is-on" : ""}`}
            >
              {r >= 1000 ? `${r / 1000}k` : r}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {!canSimulate && (
            <span className="hidden items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel sm:inline-flex">
              🔒 Pro
            </span>
          )}
          <button
            onClick={guard(() => setNonce((n) => n + 1))}
            className="btn-toggle rounded-md px-5 py-2 text-sm font-semibold uppercase tracking-wide"
          >
            ↻ Re-run
          </button>
        </div>
      </div>

      <SimResultView a={a} b={b} result={result} onPick={guard((side: "A" | "B") => setPicking(side))} runKey={`${aId}|${bId}|${rounds}|${runs}|${nonce}|${snA}|${snB}`} />

      {picking && (
        <FighterPicker
          fighters={fighters}
          aId={aId ?? ""}
          bId={bId ?? ""}
          placeholderA={phA}
          placeholderB={phB}
          firstTarget={picking}
          onSetA={setAId}
          onSetB={setBId}
          onClose={() => setPicking(null)}
        />
      )}

      {gated && <UpgradeGate loggedIn={!!user} onClose={() => setGated(false)} />}
    </div>
  );
}
