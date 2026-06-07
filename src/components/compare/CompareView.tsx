"use client";

import { useState } from "react";
import type { Fighter } from "@/lib/types";
import { FighterAvatar } from "../fighter/FighterAvatar";
import { StatBar } from "../ui/StatBar";
import { recordString, cmToIn, cmToFtIn } from "@/lib/format";

export function CompareView({ fighters, initialA, initialB }: { fighters: Fighter[]; initialA?: string; initialB?: string }) {
  const [aId, setAId] = useState(initialA ?? fighters[0].id);
  const [bId, setBId] = useState(initialB ?? fighters[1].id);
  const a = fighters.find((f) => f.id === aId)!;
  const b = fighters.find((f) => f.id === bId)!;
  const bothReal = a.statsReal && b.statsReal;

  // REAL ESPN per-fight stats only (no derived cardio/durability/opp-quality).
  const rows: { label: string; a: number; b: number; suffix?: string; max?: number }[] = [
    { label: "Sig. strikes /min", a: a.stats.slpm, b: b.stats.slpm, max: 7 },
    { label: "Striking accuracy", a: a.stats.strAcc, b: b.stats.strAcc, suffix: "%" },
    { label: "Striking defense", a: a.stats.strDef, b: b.stats.strDef, suffix: "%" },
    { label: "Takedowns /15", a: a.stats.tdAvg, b: b.stats.tdAvg, max: 6 },
    { label: "Takedown defense", a: a.stats.tdDef, b: b.stats.tdDef, suffix: "%" },
    { label: "Submission /15", a: a.stats.subAvg, b: b.stats.subAvg, max: 3 },
  ];

  const Picker = ({ value, onChange, tone }: { value: string; onChange: (v: string) => void; tone: "blood" | "edge" }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border bg-bg px-3 py-2 text-sm text-fg outline-none ${tone === "blood" ? "border-blood/40 focus:border-blood" : "border-blue/40 focus:border-blue"}`}
    >
      {fighters.map((x) => (<option key={x.id} value={x.id}>{x.name} ({x.weightClass})</option>))}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Picker value={aId} onChange={setAId} tone="blood" />
          <div className="flex items-center gap-3"><FighterAvatar fighter={a} size="lg" /><div><p className="font-display text-lg font-bold uppercase">{a.name}</p><p className="tnum text-xs text-muted">{recordString(a.record)}</p></div></div>
        </div>
        <div className="space-y-3">
          <Picker value={bId} onChange={setBId} tone="edge" />
          <div className="flex items-center justify-end gap-3 text-right"><div><p className="font-display text-lg font-bold uppercase">{b.name}</p><p className="tnum text-xs text-muted">{recordString(b.record)}</p></div><FighterAvatar fighter={b} size="lg" flip /></div>
        </div>
      </div>

      {/* Tale of the tape — real ESPN fields only ("N/A" when missing) */}
      <div className="panel rounded-xl p-5">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-faint">Tale of the tape · Source: ESPN</p>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {[
            { l: "Record", a: recordString(a.record), b: recordString(b.record) },
            { l: "Age", a: a.age || "N/A", b: b.age || "N/A" },
            { l: "Height", a: a.heightCm ? cmToFtIn(a.heightCm) : "N/A", b: b.heightCm ? cmToFtIn(b.heightCm) : "N/A" },
            { l: "Reach", a: a.reachCm ? cmToIn(a.reachCm) : "N/A", b: b.reachCm ? cmToIn(b.reachCm) : "N/A" },
            { l: "Stance", a: a.stance || "N/A", b: b.stance || "N/A" },
          ].map((r) => (
            <div key={r.l} className="contents">
              <div className="tnum border-b border-line-soft py-2 text-left font-semibold text-blood">{r.a}</div>
              <div className="border-b border-line-soft py-2 text-[11px] uppercase tracking-wider text-muted">{r.l}</div>
              <div className="tnum border-b border-line-soft py-2 text-right font-semibold text-blue">{r.b}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold uppercase">Stat-by-Stat</h2>
          <span className="text-[10px] uppercase tracking-wider text-faint">Official ESPN per-fight stats</span>
        </div>
        {bothReal ? (
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right"><StatBar label="" value={r.a} max={r.max ?? 100} suffix={r.suffix} tone="blood" /></div>
                <span className="w-24 text-center text-[10px] uppercase tracking-wider text-muted">{r.label}</span>
                <StatBar label="" value={r.b} max={r.max ?? 100} suffix={r.suffix} tone="blue" />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">Official ESPN per-fight statistics aren&apos;t available for both fighters.</p>
        )}
        <p className="mt-5 border-t border-line pt-4 text-[11px] text-muted">
          For a modelled win projection, run this matchup in the{" "}
          <a href={`/simulator?a=${a.id}&b=${b.id}`} className="text-blood hover:underline">Vex AI simulator</a> — the only modelled figures on the site.
        </p>
      </div>
    </div>
  );
}
