"use client";

import { useEffect } from "react";
import Image from "next/image";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { Fighter } from "@/lib/types";
import type { SimResult } from "@/lib/sim";
import { Radar } from "../ui/Radar";
import { Flag } from "../ui/Flag";
import { CountUp } from "../ui/CountUp";
import { torsoFor } from "@/lib/data/bodies.generated";
import { pct, lastName, recordString, cmToFtIn, cmToIn } from "@/lib/format";
import { styleMatchup } from "@/lib/style";
import { SaveInsightButton } from "./SaveInsightButton";

const ENGINE_VERSION = "VEX AI v2.1";

// ----------------------------------------------------------------------------
// Shared building blocks
// ----------------------------------------------------------------------------
// Broadcast glyph sliced from the supplied icon sheet (/public/sim/icon-*.png).
function Ic({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  return <Image src={`/sim/${name}.png`} alt="" width={size} height={size} className={`inline-block shrink-0 ${className}`} />;
}

// Inline line-icons matched to each section title (the sliced raster set was too
// limited to be contextual — e.g. Key Factors ended up with a generic badge).
const HEADER_PATHS: Record<string, React.ReactNode> = {
  prob: <><circle cx="12" cy="12" r="9" /><path d="M12 12V3M12 12l8 4" /></>,                                    // pie / odds
  results: <><line x1="3" y1="21" x2="21" y2="21" /><rect x="5" y="11" width="3" height="8" /><rect x="10.5" y="6" width="3" height="13" /><rect x="16" y="14" width="3" height="5" /></>, // bar chart
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" /></>, // info
  tape: <><path d="M8 7l-4 5 4 5M16 7l4 5-4 5M4 12h16" /></>,                                                     // head-to-head compare
  stats: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,                                                                // activity / metrics
  skill: <><path d="M12 3l8 6-3 10H7L4 9z" /><path d="M12 7.5l4.5 3.4-1.7 5.6H9.2L7.5 10.9z" /></>,               // radar pentagon
  strikes: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>, // target
  grappling: <><path d="M7 7c0 6 10 4 10 10M17 7c0 6-10 4-10 10" /></>,                                          // intertwined / grapple
  factors: <><path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" /></>, // lightbulb / insight
  rounds: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,                                          // clock / rounds
  history: <><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,    // calendar
};

function SectionIcon({ name }: { name: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fg">
      {HEADER_PATHS[name] ?? HEADER_PATHS.info}
    </svg>
  );
}

function SectionPanel({ title, icon = "info", children, className = "" }: { title: string; icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flair-rb rounded-xl border border-line p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <SectionIcon name={icon} />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-fg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Win-probability donut: red arc (A) then blue arc (B), both sweeping in from 0.
function Donut({ probA, size = 132 }: { probA: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const aLen = probA * c;
  const bLen = (1 - probA) * c;
  const p = useMotionValue(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ctrl = animate(p, 1, { duration: reduce ? 0 : 1.3, ease: "easeOut" });
    return () => ctrl.stop();
  }, [p, probA]);
  const redDash = useTransform(p, (v) => `${aLen * v} ${c}`);
  const blueDash = useTransform(p, (v) => `${bLen * v} ${c}`);
  const blueOffset = useTransform(p, (v) => -aLen * v);
  const blank = probA === 0; // empty/placeholder state — show just the ring
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#181b21" strokeWidth={stroke} />
      {!blank && (
        <>
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2e90ff" strokeWidth={stroke}
            style={{ strokeDasharray: blueDash, strokeDashoffset: blueOffset }} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e10600" strokeWidth={stroke}
            style={{ strokeDasharray: redDash }} />
        </>
      )}
    </svg>
  );
}

// A stat row: value(red) | red bar | LABEL | blue bar | value(blue). Bars scale to
// the bigger side; the numbers count up from 0.
function CompareStat({ label, a, b, decimals = 0, suffix = "" }: { label: string; a: number; b: number; decimals?: number; suffix?: string }) {
  const max = Math.max(a, b) || 1;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="tnum w-11 shrink-0 text-right font-semibold text-blood"><CountUp value={a} decimals={decimals} suffix={suffix} /></span>
      <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded bg-panel-2">
        <div className="bar-grow-r h-full rounded bg-blood" style={{ width: `${(a / max) * 100}%` }} />
      </div>
      <span className="w-36 shrink-0 text-center uppercase tracking-wide text-muted">{label}</span>
      <div className="flex h-1.5 flex-1 justify-start overflow-hidden rounded bg-panel-2">
        <div className="bar-grow h-full rounded bg-blue" style={{ width: `${(b / max) * 100}%` }} />
      </div>
      <span className="tnum w-11 shrink-0 font-semibold text-blue"><CountUp value={b} decimals={decimals} suffix={suffix} /></span>
    </div>
  );
}

// A tale-of-the-tape text row: A value | STAT label | B value.
function TapeRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="grid grid-cols-3 items-center border-t border-line/60 py-2 text-sm">
      <span className="tnum text-left text-fg">{a}</span>
      <span className="text-center text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="tnum text-right text-fg">{b}</span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Hero
// ----------------------------------------------------------------------------
function FighterHero({ f, side, onPick, className = "" }: { f: Fighter; side: "A" | "B"; onPick: () => void; className?: string }) {
  const isA = side === "A";
  const isPlaceholder = f.id.startsWith("__select"); // "Select Fighter" empty state
  const img = torsoFor(f.slug) ?? f.image ?? "/fighters/unknown-v5.png";
  const accent = isA ? "text-blood" : "text-blue";
  return (
    <button
      type="button"
      onClick={onPick}
      title="Click to change fighter"
      className={`group/h relative block min-h-[250px] w-full text-left ${className}`}
    >
      {/* red / blue broadcast plate (supplied asset), anchored to the floor.
          The fighter's name/record live INSIDE this box so they never leave the plate. */}
      <div className="absolute inset-x-0 bottom-0" style={{ aspectRatio: "559 / 158" }}>
        {/* Plate art on its own layer so the light-mode invert filter recolours
            ONLY the dark PNG (dark→light, red glow kept) and never the text. */}
        <div
          className="sim-frame absolute inset-0"
          style={{ backgroundImage: `url(/sim/frame-${isA ? "a" : "b"}.png)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
        />
        <div
          className={`sim-plate-text absolute inset-0 flex flex-col justify-center overflow-hidden py-2 ${isA ? "items-start pl-28 pr-3 text-left sm:pl-40" : "items-end pl-3 pr-28 text-right sm:pr-40"}`}
        >
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${accent} ${isA ? "" : "flex-row-reverse"}`}>
            <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] rounded-[2px]" />
            Fighter{isA ? "" : " B"}
          </span>
          <h2 className="sim-name mt-0.5 line-clamp-2 font-display text-lg font-black uppercase leading-[0.95] text-fg sm:text-xl">{f.name}</h2>
          <Image src={`/sim/bar-${isA ? "red" : "blue"}.png`} alt="" width={120} height={5} className={`mt-1 h-[4px] w-20 object-contain ${isA ? "" : "-scale-x-100"}`} />
          {f.nickname && <p className="mt-1 max-w-[11rem] truncate text-[10px] italic text-muted">“{f.nickname}”</p>}
          <p className="tnum mt-1 text-sm font-bold text-fg">{recordString(f.record)}</p>
          <p className="truncate text-[9px] uppercase tracking-wider text-muted">{f.weightClass}</p>
        </div>
      </div>
      {/* full-body shot — free to stand taller than the plate. The "Select
          Fighter" placeholder is a real fighter's body rendered SOLID BLACK
          (clean, no grain), mirrored on the blue side to face inward, with a
          faint edge so it reads on the dark background. */}
      <div className={`pointer-events-none absolute bottom-0 h-[230px] w-28 sm:w-36 ${isA ? "left-1 sm:left-3" : "right-1 sm:right-3"} ${isPlaceholder && !isA ? "-scale-x-100" : ""}`}>
        <Image src={img} alt={f.name} fill sizes="160px" className={`origin-bottom object-contain object-bottom transition-transform duration-300 group-hover/h:scale-[1.04] ${isPlaceholder ? "sim-silhouette" : ""}`} />
      </div>
    </button>
  );
}

function WinnerPanel({ winner, result, className = "" }: { winner: Fighter; result: SimResult; className?: string }) {
  const h = result.headline;
  const methodLine = h.method === "Decision"
    ? "Decision"
    : `${h.method} · Round ${h.round}${h.timeLabel ? ` · ${h.timeLabel}` : ""}`;
  return (
    // Bottom-aligned so the winner plate's bottom sits flush with the bottom of
    // the fighter plates instead of floating in the vertical centre.
    <div className={`relative flex items-end justify-center ${className}`}>
      {/* plate box with a fixed aspect — content lives INSIDE it so it never spills out */}
      <div className="relative w-full" style={{ aspectRatio: "383 / 154" }}>
        {/* Plate art on its own layer (see FighterHero) so light-mode invert
            recolours only the PNG, not the winner text. */}
        <div
          className="sim-frame absolute inset-0"
          style={{ backgroundImage: "url(/sim/frame-vs.png)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
        />
        <div className="sim-plate-text absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 text-center">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber">
            <Ic name="icon-crown" size={14} /> Winner
          </p>
          <h2 className="sim-name mt-0.5 line-clamp-1 font-display text-base font-black uppercase leading-none text-fg sm:text-lg">{winner.name}</h2>
          <Image src="/sim/bar-gold.png" alt="" width={120} height={5} className="mt-1 h-[4px] w-16 object-contain" />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{methodLine}</p>
          {/* Confidence meter — red light from the left (corner A), blue from the
              right (corner B), meeting at the win-probability split. */}
          <div className="relative mt-1.5 h-5 w-40 overflow-hidden rounded-md border border-line/80 bg-bg">
            <div
              className="bar-grow absolute inset-y-0 left-0 bg-gradient-to-r from-blood to-blood/30 shadow-[0_0_14px_rgba(225,6,0,0.75)]"
              style={{ width: `${Math.round(result.probA * 100)}%` }}
            />
            <div
              className="bar-grow-r absolute inset-y-0 right-0 bg-gradient-to-l from-blue to-blue/30 shadow-[0_0_14px_rgba(46,144,255,0.75)]"
              style={{ width: `${Math.round(result.probB * 100)}%` }}
            />
            <div className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${Math.round(result.probA * 100)}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-wide text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}>
              <CountUp value={h.confidence * 100} suffix="%" />&nbsp;Confidence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Overview panels
// ----------------------------------------------------------------------------
function WinProbability({ a, b, result }: { a: Fighter; b: Fighter; result: SimResult }) {
  const blank = result.probA === 0 && result.probB === 0; // empty/placeholder state
  return (
    <SectionPanel title="Win Probability" icon="prob">
      <div className="flex items-center justify-between gap-2">
        <div className="text-center">
          <p className="font-display text-3xl font-black text-blood sm:text-4xl"><CountUp value={result.probA * 100} suffix="%" /></p>
          <p className="mt-1 max-w-[6rem] text-[10px] uppercase tracking-wider text-muted">{a.name}</p>
        </div>
        <Donut probA={result.probA} />
        <div className="text-center">
          <p className="font-display text-3xl font-black text-blue sm:text-4xl"><CountUp value={result.probB * 100} suffix="%" /></p>
          <p className="mt-1 max-w-[6rem] text-[10px] uppercase tracking-wider text-muted">{b.name}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-blood/40 bg-blood/5 px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted">{lastName(a.name)} win range</p>
          <p className="tnum mt-0.5 text-sm font-bold text-blood"><CountUp value={result.ciLow * 100} suffix="%" /> – <CountUp value={result.ciHigh * 100} suffix="%" /></p>
        </div>
        <div className="rounded-md border border-blue/40 bg-blue/5 px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted">{lastName(b.name)} win range</p>
          <p className="tnum mt-0.5 text-sm font-bold text-blue"><CountUp value={blank ? 0 : (1 - result.ciHigh) * 100} suffix="%" /> – <CountUp value={blank ? 0 : (1 - result.ciLow) * 100} suffix="%" /></p>
        </div>
      </div>
    </SectionPanel>
  );
}

function MethodRow({ label, a, b, scale }: { label: string; a: number; b: number; scale: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <span className="tnum w-9 shrink-0 text-right font-semibold text-blood"><CountUp value={a * 100} suffix="%" /></span>
      <div className="relative h-2 flex-1 rounded bg-panel-2">
        <div className="bar-grow absolute left-0 top-0 h-full rounded-l bg-blood" style={{ width: `${Math.min(100, a * 100 * scale)}%` }} />
        <div className="bar-grow-r absolute right-0 top-0 h-full rounded-r bg-blue" style={{ width: `${Math.min(100, b * 100 * scale)}%` }} />
      </div>
      <span className="tnum w-9 shrink-0 font-semibold text-blue"><CountUp value={b * 100} suffix="%" /></span>
    </div>
  );
}

function SimulationResults({ a, b, result }: { a: Fighter; b: Fighter; result: SimResult }) {
  const otherA = Math.max(0, 1 - (result.methodA.ko + result.methodA.dec + result.methodA.sub) - (result.methodB.ko + result.methodB.dec + result.methodB.sub));
  const rows = [
    { label: "KO/TKO", a: result.methodA.ko, b: result.methodB.ko },
    { label: "Decision", a: result.methodA.dec, b: result.methodB.dec },
    { label: "Submission", a: result.methodA.sub, b: result.methodB.sub },
    { label: "Other", a: otherA, b: 0 },
  ];
  const maxVal = Math.max(...rows.flatMap((r) => [r.a, r.b]), 0.01);
  const scale = 0.92 / maxVal;
  return (
    <SectionPanel title="Simulation Results" icon="results">
      <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-wider">
        <span className="w-20 shrink-0 text-faint">Outcome</span>
        <span className="flex-1 text-left font-semibold text-blood">{lastName(a.name)}</span>
        <span className="flex-1 text-right font-semibold text-blue">{lastName(b.name)}</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => <MethodRow key={r.label} {...r} scale={scale} />)}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
        <span className="uppercase tracking-wider text-muted">Total Simulations</span>
        <span className="tnum font-bold text-fg"><CountUp value={result.runs} commas duration={1.4} /></span>
      </div>
    </SectionPanel>
  );
}

function FightInfo({ a, rounds, dateLabel }: { a: Fighter; rounds: number; dateLabel: string }) {
  const rows = [
    { k: "Weight Class", v: a.weightClass, icon: "icon-badge" },
    { k: "Engine", v: ENGINE_VERSION, icon: "icon-plus" },
    { k: "Ruleset", v: "UFC Unified Rules", icon: "icon-scales" },
    { k: "Fight Length", v: `${rounds} Rounds × 5 Min`, icon: "icon-clock" },
    { k: "Simulation Date", v: dateLabel, icon: "icon-calendar" },
  ];
  return (
    <SectionPanel title="Fight Info" icon="info">
      <div className="space-y-0">
        {rows.map((r, i) => (
          <div key={r.k} className={`flex items-center justify-between py-2.5 text-sm ${i ? "border-t border-line/60" : ""}`}>
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
              <Ic name={r.icon} size={14} className="opacity-70" /> {r.k}
            </span>
            <span className="font-semibold text-fg">{r.v}</span>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}

function TaleOfTape({ a, b, withImages = true }: { a: Fighter; b: Fighter; withImages?: boolean }) {
  // "Select Fighter" placeholders use the same solid-black body silhouette as
  // the hero (random fighter via slug); real fighters keep their headshot.
  const aPh = a.id.startsWith("__select");
  const bPh = b.id.startsWith("__select");
  const phCls = "sim-silhouette";
  const srcFor = (f: Fighter, ph: boolean) => (ph ? torsoFor(f.slug) : f.image) ?? "/fighters/unknown-v5.png";
  return (
    <SectionPanel title="Tale of the Tape" icon="tape">
      {withImages && (
        // Portraits stand ON the divider line beneath them: items-end + self-end
        // + object-bottom puts each fighter's bottom edge exactly on the border-b.
        <div className="mb-4 flex items-end justify-between border-b border-line">
          <div className="relative h-24 w-20 shrink-0 self-end">
            <Image src={srcFor(a, aPh)} alt={a.name} fill sizes="80px" className={`object-contain object-bottom ${aPh ? phCls : ""}`} />
          </div>
          <span className="pb-3 text-[10px] font-bold uppercase tracking-widest text-muted">VS</span>
          <div className={`relative h-24 w-20 shrink-0 self-end ${bPh ? "-scale-x-100" : ""}`}>
            <Image src={srcFor(b, bPh)} alt={b.name} fill sizes="80px" className={`object-contain object-bottom ${bPh ? phCls : ""}`} />
          </div>
        </div>
      )}
      <div>
        <TapeRow label="Age" a={`${a.age}`} b={`${b.age}`} />
        <TapeRow label="Height" a={cmToFtIn(a.heightCm)} b={cmToFtIn(b.heightCm)} />
        <TapeRow label="Reach" a={cmToIn(a.reachCm)} b={cmToIn(b.reachCm)} />
        <TapeRow label="Stance" a={a.stance} b={b.stance} />
        <TapeRow label="Record" a={recordString(a.record)} b={recordString(b.record)} />
      </div>
    </SectionPanel>
  );
}

function KeyStatistics({ a, b }: { a: Fighter; b: Fighter }) {
  const sa = a.stats, sb = b.stats;
  return (
    <SectionPanel title="Key Statistics" icon="stats">
      <div className="space-y-3">
        <CompareStat label="Strikes Landed / Min" a={sa.slpm} b={sb.slpm} decimals={2} />
        <CompareStat label="Striking Accuracy" a={sa.strAcc} b={sb.strAcc} suffix="%" />
        <CompareStat label="Strikes Defended" a={sa.strDef} b={sb.strDef} suffix="%" />
        <CompareStat label="Takedowns Avg" a={sa.tdAvg} b={sb.tdAvg} decimals={2} />
        <CompareStat label="Takedown Defense" a={sa.tdDef} b={sb.tdDef} suffix="%" />
        <CompareStat label="Submissions Avg" a={sa.subAvg} b={sb.subAvg} decimals={2} />
      </div>
    </SectionPanel>
  );
}

function SkillProfile({ a, b, result }: { a: Fighter; b: Fighter; result: SimResult }) {
  const data = ["Striking", "Wrestling", "Grappling", "Submission", "Cardio"].map((k) => ({
    label: k,
    a: Math.round(result.subscoresA[k]),
    b: Math.round(result.subscoresB[k]),
  }));
  return (
    <SectionPanel title="Skill Profile" icon="skill">
      <div className="flex justify-center">
        <Radar data={data} labelA={lastName(a.name)} labelB={lastName(b.name)} size={250} animate />
      </div>
    </SectionPanel>
  );
}

function RoundBreakdown({ a, b, result }: { a: Fighter; b: Fighter; result: SimResult }) {
  const rounds = result.roundDist.aFinish.length;
  const cell = (v: number, tone: "blood" | "blue") => (
    <td className={`tnum px-2 py-2 text-center font-semibold ${tone === "blood" ? "text-blood" : "text-blue"}`}><CountUp value={v * 100} suffix="%" /></td>
  );
  return (
    <SectionPanel title="Simulation Round Breakdown" icon="rounds">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-faint">
            <th className="px-2 py-1 text-left font-medium">Round</th>
            {Array.from({ length: rounds }).map((_, i) => <th key={i} className="px-2 py-1 text-center font-medium">{i + 1}</th>)}
            <th className="px-2 py-1 text-center font-medium">Decision</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-line/60">
            <td className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-blood">{lastName(a.name)} Wins</td>
            {result.roundDist.aFinish.map((v, i) => <CellWrap key={i}>{cell(v, "blood")}</CellWrap>)}
            {cell(result.roundDist.aDec, "blood")}
          </tr>
          <tr className="border-t border-line/60">
            <td className="px-2 py-2 text-left text-[11px] font-semibold uppercase text-blue">{lastName(b.name)} Wins</td>
            {result.roundDist.bFinish.map((v, i) => <CellWrap key={i}>{cell(v, "blue")}</CellWrap>)}
            {cell(result.roundDist.bDec, "blue")}
          </tr>
        </tbody>
      </table>
    </SectionPanel>
  );
}
// Table cells must be direct <td> children; this just forwards the already-built <td>.
function CellWrap({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function keyFactors(a: Fighter, b: Fighter): string[] {
  const out: string[] = [];
  const reachDiff = Math.round((a.reachCm - b.reachCm) / 2.54);
  if (Math.abs(reachDiff) >= 2) {
    const longer = reachDiff > 0 ? a : b;
    out.push(`${lastName(longer.name)}'s ${Math.abs(reachDiff)}" reach advantage gives a striking edge.`);
  }
  const kdLeader = a.stats.kdAvg >= b.stats.kdAvg ? a : b;
  if (kdLeader.stats.kdAvg > 0.3) out.push(`${lastName(kdLeader.name)}'s knockdown rate and KO threat is the X-factor.`);
  const tdLeader = a.stats.tdAvg >= b.stats.tdAvg ? a : b;
  const tdDefLeader = a.stats.tdDef >= b.stats.tdDef ? a : b;
  if (tdLeader.stats.tdAvg > 1.0) out.push(`${lastName(tdLeader.name)} can dictate where it goes — ${tdLeader.stats.tdAvg.toFixed(1)} takedowns/15.`);
  else out.push(`${lastName(tdDefLeader.name)}'s ${Math.round(tdDefLeader.stats.tdDef)}% takedown defense keeps it standing.`);
  const volLeader = a.stats.slpm >= b.stats.slpm ? a : b;
  out.push(`Expect high volume — ${lastName(volLeader.name)} lands ${volLeader.stats.slpm.toFixed(1)} sig. strikes/min.`);
  return out.slice(0, 4);
}

function KeyFactorsPanel({ a, b, result }: { a: Fighter; b: Fighter; result: SimResult }) {
  const icons = ["icon-glove", "icon-ko", "icon-scales", "icon-star"];
  // Lead with the simulation's matchup-aware swing factors (where the fight is
  // contested, momentum shifts, the decisive edge), then fill with tale-of-the-
  // tape observations.
  const items = [...(result.swingFactors ?? []).map((s) => (s.endsWith(".") ? s : s + ".")), ...keyFactors(a, b)].slice(0, 5);
  return (
    <SectionPanel title="Key Factors" icon="factors">
      <ul className="space-y-3">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-fg">
            <Ic name={icons[i % icons.length]} size={16} className="mt-0.5 opacity-80" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </SectionPanel>
  );
}

// Style read — each fighter's archetype (from their real stats) + the "styles
// make fights" matchup note. Transparent stat-based read, not footage.
function StyleMatchupPanel({ a, b }: { a: Fighter; b: Fighter }) {
  const { aType, bType, note } = styleMatchup(a, b);
  const Tag = ({ f, t }: { f: Fighter; t: { label: string; blurb: string } }) => (
    <div className="flex-1 rounded-lg border border-line/60 bg-bg/50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{lastName(f.name)}</p>
      <p className="mt-0.5 font-display text-sm font-bold uppercase text-fg">{t.label}</p>
      <p className="mt-1 text-xs leading-snug text-muted">{t.blurb}</p>
    </div>
  );
  return (
    <SectionPanel title="Style Matchup" icon="factors">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-stretch gap-2.5">
          <Tag f={a} t={aType} />
          <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-blood">vs</div>
          <Tag f={b} t={bType} />
        </div>
        <p className="text-sm leading-snug text-fg">{note}</p>
        <p className="text-[10px] uppercase tracking-widest text-faint">Style read from career statistics</p>
      </div>
    </SectionPanel>
  );
}

// ----------------------------------------------------------------------------
// Secondary tabs
// ----------------------------------------------------------------------------
function StrikingTab({ a, b }: { a: Fighter; b: Fighter }) {
  const sa = a.stats, sb = b.stats;
  return (
    <SectionPanel title="Significant Strikes" icon="strikes">
      <div className="space-y-3">
        <CompareStat label="Strikes Landed / Min" a={sa.slpm} b={sb.slpm} decimals={2} />
        <CompareStat label="Striking Accuracy" a={sa.strAcc} b={sb.strAcc} suffix="%" />
        <CompareStat label="Strikes Absorbed / Min" a={sa.sapm} b={sb.sapm} decimals={2} />
        <CompareStat label="Striking Defense" a={sa.strDef} b={sb.strDef} suffix="%" />
        <CompareStat label="Knockdowns / 15" a={sa.kdAvg} b={sb.kdAvg} decimals={2} />
      </div>
      <p className="mt-4 text-[11px] text-muted">Striking metrics are aggregated from real per-fight statistics and feed the KO/TKO finish hazard in the Vex AI simulation.</p>
    </SectionPanel>
  );
}

function GrapplingTab({ a, b }: { a: Fighter; b: Fighter }) {
  const sa = a.stats, sb = b.stats;
  return (
    <SectionPanel title="Grappling" icon="grappling">
      <div className="space-y-3">
        <CompareStat label="Takedowns / 15" a={sa.tdAvg} b={sb.tdAvg} decimals={2} />
        <CompareStat label="Takedown Accuracy" a={sa.tdAcc} b={sb.tdAcc} suffix="%" />
        <CompareStat label="Takedown Defense" a={sa.tdDef} b={sb.tdDef} suffix="%" />
        <CompareStat label="Submissions / 15" a={sa.subAvg} b={sb.subAvg} decimals={2} />
        <CompareStat label="Control / 15 (min)" a={sa.ctrl} b={sb.ctrl} decimals={1} />
      </div>
      <p className="mt-4 text-[11px] text-muted">Grappling metrics are aggregated from real per-fight statistics and feed the submission finish hazard in the Vex AI simulation.</p>
    </SectionPanel>
  );
}

function HistoryColumn({ f, tone }: { f: Fighter; tone: "blood" | "blue" }) {
  return (
    <div>
      <p className={`mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase ${tone === "blood" ? "text-blood" : "text-blue"}`}>
        <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] rounded-[2px]" /> {f.name}
      </p>
      {f.form.length === 0 ? (
        <p className="text-sm text-muted">No recent bouts on record.</p>
      ) : (
        <ul className="space-y-2">
          {f.form.slice(0, 6).map((e, i) => (
            <li key={i} className="flex items-center gap-3 rounded-md border border-line/60 bg-bg/40 px-3 py-2 text-xs">
              <span className={`tnum w-5 shrink-0 text-center font-bold ${e.result === "W" ? "text-edge" : e.result === "L" ? "text-blood" : "text-muted"}`}>{e.result}</span>
              <span className="min-w-0 flex-1 truncate text-fg">{e.opponent}</span>
              <span className="shrink-0 text-muted">{e.method}{e.round ? ` R${e.round}` : ""}</span>
              <span className="hidden shrink-0 text-faint sm:inline">{e.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
export function SimResultView({ a, b, result, onPick, runKey }: { a: Fighter; b: Fighter; result: SimResult; onPick: (side: "A" | "B") => void; runKey: string }) {
  const winner = result.headline.winnerSide === "A" ? a : b;
  const rounds = result.roundDist.aFinish.length;
  const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const share = async () => {
    const text = `${a.name} vs ${b.name} — Vex AI predicts ${winner.name} by ${result.headline.method} (${pct(result.headline.confidence)})`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ title: "FightVex Simulation", text, url: typeof location !== "undefined" ? location.href : undefined });
      else if (typeof navigator !== "undefined" && navigator.clipboard) await navigator.clipboard.writeText(`${text} — ${typeof location !== "undefined" ? location.href : ""}`);
    } catch { /* user cancelled */ }
  };

  return (
    <div className="space-y-4">
      {/* meta strip — floats on the page background */}
      <div className="flex items-center justify-end gap-4 text-[11px] text-muted">
        <span>Simulated: <span className="tnum font-semibold text-fg">{result.runs.toLocaleString()}</span> times</span>
        <span className="hidden sm:inline">Version: <span className="font-semibold text-fg">{ENGINE_VERSION}</span></span>
        <SaveInsightButton key={`save-${runKey}`} a={a} b={b} result={result} runs={result.runs} />
        <button onClick={share} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1 font-semibold text-fg transition-colors hover:border-steel">
          ⤴ Share
        </button>
      </div>

      {/* hero — fighter plates fly in from their corners, winner pops in.
          Keyed by runKey so it replays whenever the matchup/params change. */}
      <div key={`hero-${runKey}`} className="grid items-stretch gap-2 md:grid-cols-[1fr_minmax(230px,0.78fr)_1fr]">
        <FighterHero f={a} side="A" onPick={() => onPick("A")} className="animate-in-left" />
        <WinnerPanel winner={winner} result={result} className="animate-pop [animation-delay:0.12s]" />
        <FighterHero f={b} side="B" onPick={() => onPick("B")} className="animate-in-right" />
      </div>

      {/* All simulator stats in one view — keyed so panels re-stagger on re-run. */}
      <div key={`stats-${runKey}`} className="stagger grid gap-4 lg:grid-cols-3">
        <WinProbability a={a} b={b} result={result} />
        <SimulationResults a={a} b={b} result={result} />
        <FightInfo a={a} rounds={rounds} dateLabel={dateLabel} />
        <TaleOfTape a={a} b={b} />
        <KeyStatistics a={a} b={b} />
        <SkillProfile a={a} b={b} result={result} />
        <StyleMatchupPanel a={a} b={b} />
        <StrikingTab a={a} b={b} />
        <GrapplingTab a={a} b={b} />
        <KeyFactorsPanel a={a} b={b} result={result} />
        <div className="lg:col-span-3"><RoundBreakdown a={a} b={b} result={result} /></div>
        <div className="lg:col-span-3">
          <SectionPanel title="Fight History" icon="history">
            <div className="grid gap-6 md:grid-cols-2">
              <HistoryColumn f={a} tone="blood" />
              <HistoryColumn f={b} tone="blue" />
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="px-5 pt-1 text-center text-[10px] leading-relaxed text-faint">
        Vex AI simulations are based on statistical analysis of real, aggregated fight data. Results are a model output for entertainment only — not a guarantee of any outcome and not betting advice. 21+.
      </p>
    </div>
  );
}
