"use client";

import Image from "next/image";
import { Flag } from "../ui/Flag";
import { torsoFor } from "@/lib/data/bodies.generated";
import { facingFor } from "@/lib/data/facing.generated";
import type { PickFighter } from "@/lib/predictions";

// The simulator's fighter / winner / fighter result hero, reused for a logged
// pick — static (no click, no insights). Same plates, bars and confidence meter
// as SimResultView so picks read exactly like a simulation.

// Default body for fighters with no photo: a real fighter's torso rendered solid
// black (no outline), like the simulator placeholder — one fixed male, one female.
const DEFAULT_MALE = "ciryl-gane";
const DEFAULT_FEMALE = "valentina-shevchenko";

function Plate({ f, side }: { f: PickFighter; side: "A" | "B" }) {
  const isA = side === "A";
  // Real image first: full-body torso, then headshot (like the simulator).
  const real = torsoFor(f.slug) || f.image;
  const female = /women|^w\s|w'?s\s/i.test(f.weightClass);
  const silhouette = !real;
  const facingSlug = real ? f.slug : (female ? DEFAULT_FEMALE : DEFAULT_MALE);
  const img = real || torsoFor(female ? DEFAULT_FEMALE : DEFAULT_MALE) || "/fighters/unknown-v5.png";
  // Mirror so BOTH fighters face INWARD: A should face right, B should face left.
  // Most photos face right, so the few left-facers (facing.generated) flip the
  // opposite way — this keeps everyone looking into the matchup, not outward.
  const facing = facingFor(facingSlug);
  const flip = isA ? facing === "L" : facing === "R";
  const accent = isA ? "text-blood" : "text-blue";
  return (
    <div className="relative min-h-[230px] w-full">
      <div className="absolute inset-x-0 bottom-0" style={{ aspectRatio: "559 / 158" }}>
        <div className="sim-frame absolute inset-0" style={{ backgroundImage: `url(/sim/frame-${isA ? "a" : "b"}.png)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }} />
        <div className={`sim-plate-text absolute inset-0 flex flex-col justify-center overflow-hidden py-2 ${isA ? "items-start pl-28 pr-3 text-left sm:pl-40" : "items-end pl-3 pr-28 text-right sm:pr-40"}`}>
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${accent} ${isA ? "" : "flex-row-reverse"}`}>
            {f.flag ? <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] rounded-[2px]" /> : null}
            Fighter{isA ? "" : " B"}
          </span>
          <h2 className="sim-name mt-0.5 line-clamp-2 font-display text-lg font-black uppercase leading-[0.95] text-fg sm:text-xl">{f.name}</h2>
          <Image src={`/sim/bar-${isA ? "red" : "blue"}.png`} alt="" width={120} height={5} className={`mt-1 h-[4px] w-20 object-contain ${isA ? "" : "-scale-x-100"}`} />
          {f.nickname && <p className="mt-1 max-w-[11rem] truncate text-[10px] italic text-muted">“{f.nickname}”</p>}
          {f.record && <p className="tnum mt-1 text-sm font-bold text-fg">{f.record}</p>}
          {f.weightClass && <p className="truncate text-[9px] uppercase tracking-wider text-muted">{f.weightClass}</p>}
        </div>
      </div>
      <div className={`pointer-events-none absolute bottom-0 h-[210px] w-28 sm:w-36 ${isA ? "left-1 sm:left-3" : "right-1 sm:right-3"} ${flip ? "-scale-x-100" : ""}`}>
        <Image src={img} alt={f.name} fill sizes="160px" className={`origin-bottom object-contain object-bottom ${silhouette ? "pick-silhouette" : ""}`} />
      </div>
    </div>
  );
}

function WinnerPlate({ winnerName, method, probA, confidence }: { winnerName: string; method: string; probA: number; confidence: number }) {
  const a = Math.round(probA * 100);
  return (
    <div className="relative flex items-end justify-center">
      <div className="relative w-full" style={{ aspectRatio: "383 / 154" }}>
        <div className="sim-frame absolute inset-0" style={{ backgroundImage: "url(/sim/frame-vs.png)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }} />
        <div className="sim-plate-text absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 text-center">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber">
            <Image src="/sim/icon-crown.png" alt="" width={14} height={14} className="inline-block shrink-0" /> Vex Pick
          </p>
          <h2 className="sim-name mt-0.5 line-clamp-1 font-display text-base font-black uppercase leading-none text-amber sm:text-lg">{winnerName}</h2>
          <Image src="/sim/bar-gold.png" alt="" width={120} height={5} className="mt-1 h-[4px] w-16 object-contain" />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{method}</p>
          <div className="relative mt-1.5 h-5 w-40 overflow-hidden rounded-md border border-line/80 bg-bg">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blood to-blood/30 shadow-[0_0_14px_rgba(225,6,0,0.75)]" style={{ width: `${a}%` }} />
            <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-blue to-blue/30 shadow-[0_0_14px_rgba(46,144,255,0.75)]" style={{ width: `${100 - a}%` }} />
            <div className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${a}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-wide text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}>
              {Math.round(confidence * 100)}%&nbsp;Confidence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type PickStatus =
  | { kind: "pending" }
  | { kind: "graded"; correct: boolean; actualName: string; actualMethod: string | null };

export function PickResultHero({ a, b, probA, winnerName, method, confidence, status }: {
  a: PickFighter; b: PickFighter; probA: number; winnerName: string; method: string; confidence: number; status?: PickStatus;
}) {
  return (
    <div>
      <div className="grid items-stretch gap-2 md:grid-cols-[1fr_minmax(220px,0.78fr)_1fr]">
        <Plate f={a} side="A" />
        <WinnerPlate winnerName={winnerName} method={method} probA={probA} confidence={confidence} />
        <Plate f={b} side="B" />
      </div>
      {status && (
        <div className="mt-2 flex justify-center">
          {status.kind === "pending" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edge/40 bg-edge/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-edge">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="3.5" y="7" width="9" height="6.3" rx="1.3" stroke="currentColor" strokeWidth="1.3" /><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" stroke="currentColor" strokeWidth="1.3" /></svg>
              Locked in · result pending
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${status.correct ? "border-edge/50 bg-edge/10 text-edge" : "border-blood/50 bg-blood/10 text-blood"}`}>
              {status.correct ? "✓ Correct" : "✗ Miss"} · {status.actualName.split(" ").slice(-1)[0]} won{status.actualMethod ? ` · ${status.actualMethod}` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
