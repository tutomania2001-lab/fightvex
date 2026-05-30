"use client";

import { useState } from "react";
import type { Fighter } from "@/lib/types";
import { subscores } from "@/lib/sim";
import { FighterAvatar } from "../fighter/FighterAvatar";
import { Radar } from "../ui/Radar";
import { StatBar } from "../ui/StatBar";
import { recordString, cmToIn, cmToFtIn, lastName } from "@/lib/format";

export function CompareView({ fighters, initialA, initialB }: { fighters: Fighter[]; initialA?: string; initialB?: string }) {
  const [aId, setAId] = useState(initialA ?? fighters[0].id);
  const [bId, setBId] = useState(initialB ?? fighters[1].id);
  const a = fighters.find((f) => f.id === aId)!;
  const b = fighters.find((f) => f.id === bId)!;
  const subA = subscores(a);
  const subB = subscores(b);

  const radar = ["Striking", "Wrestling", "Grappling", "Submission", "Cardio", "Durability"].map((k) => ({
    label: k.slice(0, 4),
    a: Math.round(subA[k]),
    b: Math.round(subB[k]),
  }));

  const rows: { label: string; a: number; b: number; suffix?: string; max?: number }[] = [
    { label: "Sig. strikes /min", a: a.stats.slpm, b: b.stats.slpm, max: 7 },
    { label: "Striking accuracy", a: a.stats.strAcc, b: b.stats.strAcc, suffix: "%" },
    { label: "Striking defense", a: a.stats.strDef, b: b.stats.strDef, suffix: "%" },
    { label: "Takedowns /15", a: a.stats.tdAvg, b: b.stats.tdAvg, max: 6 },
    { label: "Takedown defense", a: a.stats.tdDef, b: b.stats.tdDef, suffix: "%" },
    { label: "Submission /15", a: a.stats.subAvg, b: b.stats.subAvg, max: 3 },
    { label: "Cardio", a: a.stats.cardio, b: b.stats.cardio },
    { label: "Durability", a: a.stats.durability, b: b.stats.durability },
    { label: "Opp. quality", a: a.oppQuality, b: b.oppQuality },
  ];

  const Picker = ({ value, onChange, tone }: { value: string; onChange: (v: string) => void; tone: "blood" | "edge" }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border bg-bg px-3 py-2 text-sm text-fg outline-none ${tone === "blood" ? "border-blood/40 focus:border-blood" : "border-edge/40 focus:border-edge"}`}
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
          <div className="flex items-center justify-end gap-3 text-right"><div><p className="font-display text-lg font-bold uppercase">{b.name}</p><p className="tnum text-xs text-muted">{recordString(b.record)}</p></div><FighterAvatar fighter={b} size="lg" /></div>
        </div>
      </div>

      {/* Tale of the tape */}
      <div className="panel rounded-xl p-5">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {[
            { l: "Age", a: a.age, b: b.age },
            { l: "Height", a: cmToFtIn(a.heightCm), b: cmToFtIn(b.heightCm) },
            { l: "Reach", a: cmToIn(a.reachCm), b: cmToIn(b.reachCm) },
            { l: "Stance", a: a.stance, b: b.stance },
            { l: "Layoff", a: `${a.layoffMonths}mo`, b: `${b.layoffMonths}mo` },
          ].map((r) => (
            <div key={r.l} className="contents">
              <div className="tnum border-b border-line-soft py-2 text-left font-semibold text-blood">{r.a}</div>
              <div className="border-b border-line-soft py-2 text-[11px] uppercase tracking-wider text-muted">{r.l}</div>
              <div className="tnum border-b border-line-soft py-2 text-right font-semibold text-edge">{r.b}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel flex flex-col items-center rounded-xl p-6">
          <h2 className="mb-2 self-start font-display text-lg font-bold uppercase">Skill Overlay</h2>
          <Radar data={radar} labelA={lastName(a.name)} labelB={lastName(b.name)} />
        </div>
        <div className="panel rounded-xl p-6">
          <h2 className="mb-4 font-display text-lg font-bold uppercase">Stat-by-Stat</h2>
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right"><StatBar label="" value={r.a} max={r.max ?? 100} suffix={r.suffix} tone="blood" /></div>
                <span className="w-24 text-center text-[10px] uppercase tracking-wider text-muted">{r.label}</span>
                <StatBar label="" value={r.b} max={r.max ?? 100} suffix={r.suffix} tone="edge" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
