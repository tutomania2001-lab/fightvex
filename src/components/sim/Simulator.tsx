"use client";

import { useMemo, useState } from "react";
import type { Fighter } from "@/lib/types";
import { simulate, type SimParams } from "@/lib/sim";
import { SimResultView } from "./SimResultView";
import { FighterAvatar } from "../fighter/FighterAvatar";
import { recordString } from "@/lib/format";

export function Simulator({
  fighters,
  initialA,
  initialB,
}: {
  fighters: Fighter[];
  initialA?: string;
  initialB?: string;
}) {
  const [aId, setAId] = useState(initialA ?? fighters[0].id);
  const [bId, setBId] = useState(initialB ?? fighters[1].id);
  const [rounds, setRounds] = useState<3 | 5>(5);
  const [snA, setSnA] = useState(false);
  const [snB, setSnB] = useState(false);
  const [runs, setRuns] = useState(1000);
  const [nonce, setNonce] = useState(0);

  const a = fighters.find((f) => f.id === aId)!;
  const b = fighters.find((f) => f.id === bId)!;

  const result = useMemo(() => {
    const params: SimParams = { rounds, shortNoticeA: snA, shortNoticeB: snB, runs: runs + nonce * 7 };
    return simulate(a, b, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aId, bId, rounds, snA, snB, runs, nonce]);

  const Picker = ({ value, onChange, side }: { value: string; onChange: (v: string) => void; side: "A" | "B" }) => {
    const f = fighters.find((x) => x.id === value)!;
    return (
      <div className={`rounded-xl border p-4 ${side === "A" ? "border-blood/40" : "border-edge/40"} bg-panel-2/40`}>
        <div className="flex items-center gap-3">
          <FighterAvatar fighter={f} size="lg" />
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${side === "A" ? "text-blood" : "text-edge"}`}>Fighter {side}</p>
            <p className="truncate font-display text-lg font-bold uppercase">{f.name}</p>
            <p className="tnum text-xs text-muted">{recordString(f.record)} · {f.weightClass}</p>
          </div>
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-blood"
        >
          {fighters.map((x) => (
            <option key={x.id} value={x.id}>{x.name} ({x.weightClass})</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Picker value={aId} onChange={setAId} side="A" />
        <div className="flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-muted">VS</span>
        </div>
        <Picker value={bId} onChange={setBId} side="B" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel/60 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Rounds</span>
          {[3, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRounds(r as 3 | 5)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${rounds === r ? "bg-blood text-white" : "border border-line text-muted hover:text-fg"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={snA} onChange={(e) => setSnA(e.target.checked)} className="accent-blood" /> A short-notice
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={snB} onChange={(e) => setSnB(e.target.checked)} className="accent-edge" /> B short-notice
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Runs</span>
          {[100, 1000, 5000].map((r) => (
            <button
              key={r}
              onClick={() => setRuns(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${runs === r ? "bg-panel-2 text-fg" : "border border-line text-muted hover:text-fg"}`}
            >
              {r >= 1000 ? `${r / 1000}k` : r}
            </button>
          ))}
        </div>
        <button
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto rounded-md bg-blood px-5 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-blood-dim"
        >
          ↻ Re-run
        </button>
      </div>

      <div className="panel rounded-xl p-5 sm:p-6">
        <SimResultView a={a} b={b} result={result} />
      </div>
    </div>
  );
}
