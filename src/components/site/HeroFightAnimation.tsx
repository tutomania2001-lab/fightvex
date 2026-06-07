"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useScroll,
  animate as fmAnimate,
} from "framer-motion";
import { nextEvent } from "@/lib/data/events";

// â"€â"€â"€ Count-up hook â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function useCountUp(target: number, active: boolean, delay: number, duration = 1.4) {
  const val = useMotionValue(0);
  const rounded = useTransform(val, (v) => Math.round(v));
  useEffect(() => {
    if (!active) { val.set(0); return; } // reset to 0 so it re-animates on next activation
    const t = setTimeout(() => fmAnimate(val, target, { duration, ease: "easeOut" }), delay * 1000);
    return () => clearTimeout(t);
  }, [active, val, target, delay, duration]);
  return rounded;
}

// â"€â"€â"€ Circular ring â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function CircularRing({ value, active, delay }: { value: number; active: boolean; delay: number }) {
  const size = 84;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const prog = useMotionValue(0);
  const dashOffset = useTransform(prog, [0, 100], [circ, 0]);
  const pct = useCountUp(value, active, delay);
  useEffect(() => {
    if (!active) { prog.set(0); return; } // reset ring on deactivation
    const t = setTimeout(() => fmAnimate(prog, value, { duration: 1.6, ease: "easeOut" }), delay * 1000);
    return () => clearTimeout(t);
  }, [active, prog, value, delay]);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(225,6,0,0.18)" strokeWidth={7} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e10600" strokeWidth={7}
          strokeLinecap="round" strokeDasharray={circ} style={{ strokeDashoffset: dashOffset }} />
      </svg>
      <span className="relative font-display text-xl font-bold leading-none text-fg">
        <motion.span>{pct}</motion.span>%
      </span>
    </div>
  );
}

// â"€â"€â"€ Shield frame (Takedown DEF) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Compact frame: flat top + straight sides + a half-moon (semicircle) bottom that
// hugs the circular ring. Same glass fill + subtle gray outline as the other stats.
function ShieldFrame({ label, value, active, delay, mobile, origin }: {
  label: string; value: number; active: boolean; delay: number; mobile?: boolean; origin: string;
}) {
  const RING = 84;                    // circular ring diameter
  const P = 2;                        // margin so the outline stroke is never clipped
  const W = RING + 24;                // 12px padding each side around the ring
  const R = (W - 2 * P) / 2;          // bottom semicircle radius (spans inset width)
  const yMid = 72;                    // ring center y / where straight sides meet the arc
  const H = yMid + R + P;             // straight section + half-moon + bottom margin
  const arch = `M${P} ${P} L${W - P} ${P} L${W - P} ${yMid} A${R} ${R} 0 0 1 ${P} ${yMid} Z`;
  const clip = { clipPath: `path('${arch}')`, WebkitClipPath: `path('${arch}')` } as CSSProperties;
  return (
    <div className={`relative ${mobile ? `scale-[0.66] ${origin}` : ""}`} style={{ width: W, height: H }}>
      <div className="absolute inset-0 bg-bg/88 backdrop-blur-md" style={clip} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0">
        <path d={arch} fill="none" stroke="var(--color-line)" strokeOpacity={0.7} strokeWidth={1.5} />
      </svg>
      <p className="absolute inset-x-0 top-2 text-center text-[10px] font-semibold uppercase tracking-tight text-muted">{label}</p>
      <div className="absolute" style={{ left: (W - RING) / 2, top: yMid - RING / 2 }}>
        <CircularRing value={value} active={active} delay={delay} />
      </div>
    </div>
  );
}

// â"€â"€â"€ Mini sparkline â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function MiniSparkline({ value, active, delay }: { value: number; active: boolean; delay: number }) {
  const heights = [40, 65, 50, 85, 60, 75, value];
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
      {heights.map((h, i) => (
        <motion.div key={i} className="w-[5px] rounded-sm bg-blood" style={{ height: `${h}%` }}
          initial={{ scaleY: 0, originY: 1 }} animate={active ? { scaleY: 1 } : {}}
          transition={{ delay: delay + i * 0.06, duration: 0.35, ease: "easeOut" }} />
      ))}
    </div>
  );
}

// â"€â"€â"€ Stat card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
type StatCardDef = {
  label: string; value: number; type: "circular" | "bar";
  pos: string; posMobile: string; entryDelay: number; floatDelay: number;
};

function StatCard({ card, active, mobile }: { card: StatCardDef; active: boolean; mobile?: boolean }) {
  const pct = useCountUp(card.value, active, card.entryDelay + 0.35);
  const origin = card.posMobile.includes("right") ? "origin-top-right" : "origin-top-left";
  return (
    <motion.div className={`absolute z-20 ${mobile ? card.posMobile : card.pos}`}
      initial={{ y: "10%", opacity: 0 }}
      animate={active ? { y: 0, opacity: 1 } : {}}
      transition={{ delay: card.entryDelay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
      <motion.div animate={active ? { y: [0, -6, 0, 6, 0] } : {}}
        transition={{ delay: card.floatDelay, duration: 4.0, repeat: Infinity, ease: "easeInOut" }}>
        {card.type === "circular" ? (
          // Shield-shaped frame for Takedown DEFENSE.
          <ShieldFrame label={card.label} value={card.value} active={active} delay={card.entryDelay + 0.35} mobile={mobile} origin={origin} />
        ) : (
          <div className={`rounded-xl border border-line/70 bg-bg/88 px-4 py-3 backdrop-blur-md ${mobile ? `scale-[0.66] ${origin}` : ""}`} style={{ minWidth: 155 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">{card.label}</p>
            <div className="mt-1.5">
              <p className="font-display text-3xl font-bold leading-none text-fg"><motion.span>{pct}</motion.span>%</p>
              <div className="mt-1.5"><MiniSparkline value={card.value} active={active} delay={card.entryDelay + 0.35} /></div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// â"€â"€â"€ Predicted Winner card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function PredictedWinnerCard({ active, winner = "J. Holloway", pct: targetPct = 63, confidence = "7.8/10", mobile }: {
  active: boolean; winner?: string; pct?: number; confidence?: string; mobile?: boolean;
}) {
  const pct = useCountUp(targetPct, active, 1.35);
  return (
    <motion.div className={`absolute left-1/2 z-20 -translate-x-1/2 ${mobile ? "top-[4%]" : "bottom-[52%]"}`}
      initial={{ y: "8%", scale: 0.94, opacity: 0 }}
      animate={active ? { y: 0, scale: 1, opacity: 1 } : {}}
      transition={{ delay: 1.05, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}>
      <motion.div animate={active ? { y: [0, -6, 0, 6, 0] } : {}}
        transition={{ delay: 2.6, duration: 4.0, repeat: Infinity, ease: "easeInOut" }}>
        <div className={`rounded-xl border border-line/70 bg-bg/90 px-5 py-4 text-center backdrop-blur-md ${mobile ? "scale-[0.8]" : ""}`} style={{ minWidth: 200 }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Predicted Winner</p>
          <p className="mt-1.5 font-display text-base font-bold uppercase text-fg">{winner}</p>
          <p className="mt-1.5 font-display text-5xl font-black leading-none text-fg"><motion.span>{pct}</motion.span>%</p>
          <div className="my-2 h-px bg-line/50" />
          <p className="text-[11px] uppercase tracking-wider text-muted">Confidence <span className="font-semibold text-fg">{confidence}</span></p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// â"€â"€â"€ Significant Strikes chart â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function StrikesChartCard({ active, s1 = [28,65,72,96,78], s2 = [22,20,28,28,26], deltaTarget = 23, mobile }: {
  active: boolean; s1?: number[]; s2?: number[]; deltaTarget?: number; mobile?: boolean;
}) {
  const ML=30,MR=8,MT=8,MB=22,SW=256,SH=120;
  const PW=SW-ML-MR, PH=SH-MT-MB, Y_MAX=100;
  const Y_TICKS=[0,25,50,75,100];
  const X_LABELS=["R1","R2","R3","R4","R5"];
  const xs=(i:number)=>ML+(i/(X_LABELS.length-1))*PW;
  const ys=(v:number)=>MT+PH-(v/Y_MAX)*PH;
  const mkPath=(data:number[])=>data.map((v,i)=>`${i===0?"M":"L"} ${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const delta=useCountUp(deltaTarget,active,1.55,1.0);
  return (
    <motion.div className={`absolute left-1/2 z-20 -translate-x-1/2 ${mobile ? "bottom-[21%]" : "bottom-[8%]"}`}
      initial={{ y:"8%",scale:0.96,opacity:0 }}
      animate={active?{y:0,scale:1,opacity:1}:{}}
      transition={{delay:1.05,duration:0.75,ease:[0.16,1,0.3,1]}}>
      <motion.div animate={active?{y:[0,-6,0,6,0]}:{}} transition={{delay:2.6,duration:4.0,repeat:Infinity,ease:"easeInOut"}}>
        <div className={`rounded-xl border border-line/70 bg-bg/90 px-4 py-3 backdrop-blur-md ${mobile ? "scale-[0.74]" : ""}`} style={{minWidth:300}}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">Significant Strikes</p>
            <p className="font-display text-sm font-bold text-blood">+<motion.span>{delta}</motion.span></p>
          </div>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            {Y_TICKS.map(tick=>(
              <g key={tick}>
                <line x1={ML} y1={ys(tick)} x2={ML+PW} y2={ys(tick)} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="3 4"/>
                <text x={ML-5} y={ys(tick)+4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)" fontFamily="monospace">{tick}</text>
              </g>
            ))}
            <line x1={ML} y1={MT+PH} x2={ML+PW} y2={MT+PH} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
            {X_LABELS.map((lbl,i)=>(
              <text key={lbl} x={xs(i)} y={SH-5} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.45)" fontFamily="sans-serif" fontWeight="600">{lbl}</text>
            ))}
            <motion.path d={mkPath(s2)} fill="none" stroke="#e10600" strokeWidth={1.8} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round"
              initial={{pathLength:0}} animate={active?{pathLength:1}:{}} transition={{delay:1.5,duration:1.2,ease:"easeInOut"}}/>
            {s2.map((v,i)=><motion.circle key={i} cx={xs(i)} cy={ys(v)} r={2.5} fill="#e10600" fillOpacity={0.5} initial={{scale:0}} animate={active?{scale:1}:{}} transition={{delay:1.6+i*0.08,duration:0.2}}/>)}
            <motion.path d={mkPath(s1)} fill="none" stroke="#e10600" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              initial={{pathLength:0}} animate={active?{pathLength:1}:{}} transition={{delay:1.35,duration:1.3,ease:"easeInOut"}}/>
            {s1.map((v,i)=><motion.circle key={i} cx={xs(i)} cy={ys(v)} r={3.5} fill="#e10600" initial={{scale:0}} animate={active?{scale:1}:{}} transition={{delay:1.45+i*0.1,duration:0.25}}/>)}
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
}

// â"€â"€â"€ Layer types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
type LayerDef = {
  src: string; alt: string; priority?: boolean;
  entryDelay: number; entryDuration?: number;
  initial: Record<string, string | number>;
  float?: { delay: number; amplitude?: number; duration?: number };
  imgScale?: number; // upscales the image within its container
};

// Slide 1 â€" AI demo fighters
// ─── Slide 1: brand mark (3D X) + hovering FightVex feature cards ───────────
const FEATURES: { title: string; desc: string; pos: string; posMobile: string; entryDelay: number; floatDelay: number; icon: ReactNode }[] = [
  { title: "Vex AI Simulator", desc: "Backtested on 10k+ fights", pos: "left-[7%] top-[10%]", posMobile: "left-[1%] top-[11%]", entryDelay: 0.7, floatDelay: 2.6,
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></> },
  { title: "Fighter Metrics", desc: "40+ real stats / fighter", pos: "left-[1%] top-[36%]", posMobile: "left-[1%] top-[41%]", entryDelay: 0.85, floatDelay: 2.9,
    icon: <><line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="11" width="3" height="7" /><rect x="10.5" y="6" width="3" height="12" /><rect x="15" y="14" width="3" height="4" /></> },
  { title: "Intelligence Feed", desc: "Live UFC news, sourced", pos: "left-[8%] bottom-[8%]", posMobile: "left-[1%] bottom-[7%]", entryDelay: 1.0, floatDelay: 3.1,
    icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h7M7 12h10M7 16h6" /></> },
  { title: "Live Odds Signals", desc: "Real market + value", pos: "left-[1%] top-[61%]", posMobile: "right-[1%] top-[11%]", entryDelay: 0.75, floatDelay: 2.7,
    icon: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M7.5 14.5a4.5 4.5 0 0 1 9 0" /><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" /></> },
  { title: "Betting Edge", desc: "EV · CLV · bankroll", pos: "right-[8%] top-[52%]", posMobile: "right-[1%] top-[41%]", entryDelay: 0.9, floatDelay: 3.0,
    icon: <><path d="M3 17l6-6 4 4 7-7" /><path d="M17 5h4v4" /></> },
  { title: "Line Movement", desc: "Real odds tracker", pos: "right-[15%] bottom-[8%]", posMobile: "right-[1%] bottom-[7%]", entryDelay: 1.05, floatDelay: 3.2,
    icon: <><path d="M3 12l4 4 5-9 4 6 5-7" /></> },
];

function FeatureCard({ f, active, mobile }: { f: (typeof FEATURES)[number]; active: boolean; mobile?: boolean }) {
  const origin = f.pos.includes("right") ? "origin-top-right" : "origin-top-left";
  return (
    <motion.div className={`absolute z-30 ${mobile ? f.posMobile : f.pos}`}
      initial={{ y: "16%", opacity: 0 }} animate={active ? { y: 0, opacity: 1 } : {}}
      transition={{ delay: f.entryDelay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
      <motion.div animate={active ? { y: [0, -6, 0, 6, 0] } : {}}
        transition={{ delay: f.floatDelay, duration: 4.2, repeat: Infinity, ease: "easeInOut" }}>
        <div className={`flex items-center gap-3.5 rounded-xl border border-line/70 bg-bg/85 px-5 py-4 backdrop-blur-md ${mobile ? `scale-[0.66] ${origin}` : ""}`} style={{ minWidth: 240 }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blood/30 bg-blood/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e10600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
          </span>
          <div>
            <p className="font-display text-base font-bold uppercase leading-tight text-fg">{f.title}</p>
            <p className="text-xs leading-tight text-muted">{f.desc}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HeroLogo({ active }: { active: boolean }) {
  return (
    <motion.div className="absolute inset-0 z-20 flex items-center justify-center pb-[8%]"
      initial={{ scale: 0.8, opacity: 0 }} animate={active ? { scale: 1, opacity: 1 } : {}}
      transition={{ delay: 0.15, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}>
      <motion.div className="relative h-[55%] w-[55%] lg:h-[72%] lg:w-[72%]"
        animate={active ? { y: [0, -12, 0, 12, 0], rotate: [0, 1.4, 0, -1.4, 0] } : {}}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
        <Image src="/ui/hero-x-logo.png" alt="FightVex" fill sizes="50vw" priority className="object-contain drop-shadow-[0_24px_60px_rgba(0,0,0,0.7)]" />
      </motion.div>
    </motion.div>
  );
}

// Slide 2 â€" real event fighters (transparent PNG, same object-bottom positioning)
const EVENT_LAYERS: LayerDef[] = [
  { src: "/ui/event-topuria.png", alt: "Ilia Topuria", priority: true, entryDelay: 0, entryDuration: 0.9, initial: { y: "8%", opacity: 0 } },
  { src: "/ui/event-gaethje.png", alt: "Justin Gaethje", priority: true, entryDelay: 0, entryDuration: 0.9, initial: { y: "8%", opacity: 0 } },
];

// Slide 1 stat cards
// Slide 2 stat cards â€" Vanguard FC 14: Morales vs Petrov
const EVENT_STAT_CARDS: StatCardDef[] = [
  { label: "Strike Accuracy", value: 63, type: "bar",      pos: "left-[3%] bottom-[42%]", posMobile: "left-[1%] top-[9%]",  entryDelay: 0.3, floatDelay: 2.0 },
  { label: "Takedown DEF",    value: 78, type: "circular", pos: "left-[3%] bottom-[8%]",  posMobile: "left-[1%] top-[19%]",  entryDelay: 0.3, floatDelay: 2.2 },
  { label: "Strike Accuracy", value: 58, type: "bar",      pos: "right-[3%] bottom-[42%]",posMobile: "right-[1%] top-[9%]", entryDelay: 0.3, floatDelay: 2.1 },
  { label: "Takedown DEF",    value: 45, type: "circular", pos: "right-[3%] bottom-[8%]", posMobile: "right-[1%] top-[19%]", entryDelay: 0.3, floatDelay: 2.3 },
];

// â"€â"€â"€ AnimLayer â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function AnimLayer({ layer, active }: { layer: LayerDef; active: boolean }) {
  const amp = layer.float?.amplitude ?? 6;
  const imgStyle = layer.imgScale ? { transform: `scale(${layer.imgScale})`, transformOrigin: "bottom center" } : undefined;
  const img = (
    <div className="absolute inset-0" style={imgStyle}>
      <Image src={layer.src} alt={layer.alt} fill className="object-contain object-bottom" priority={layer.priority} sizes="65vw" />
    </div>
  );
  return (
    <motion.div className="absolute inset-0"
      initial={layer.initial}
      animate={active ? { x: 0, y: 0, scale: 1, opacity: 1 } : layer.initial}
      transition={{ delay: layer.entryDelay, duration: layer.entryDuration ?? 0.7, ease: [0.16, 1, 0.3, 1] }}>
      {layer.float ? (
        <motion.div className="relative h-full w-full"
          animate={active ? { y: [0, -amp, 0, amp, 0] } : {}}
          transition={{ delay: layer.float.delay, duration: layer.float.duration ?? 4, repeat: Infinity, ease: "easeInOut" }}>
          {img}
        </motion.div>
      ) : img}
    </motion.div>
  );
}

// ─── Left content overlay (Fight Card / Fighters / Research) ────────────────────
// Shows over the SAME hero background, in the same left region the Bet Smarter
// text occupies. Transition = a timed SLIDE-up (no fade); opacity is an instant
// hard cut so nothing cross-fades. Speed is set by `duration`, independent of
// how far the page scrolls.
function PanelOverlay({ children, active, duration }: {
  children: ReactNode; active: boolean; duration: number;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-start lg:items-center"
      initial={false}
      animate={{ y: active ? 0 : 48, opacity: active ? 1 : 0 }}
      transition={{ y: { duration, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0 } }}
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      <div
        data-hero-scroll
        className="max-h-[calc(100svh-1rem)] w-full max-w-[560px] overflow-y-auto overscroll-contain px-4 pb-8 pt-20 sm:pl-6 sm:pr-0 lg:max-h-none lg:overflow-visible lg:pl-8 lg:pt-24"
      >
        {children}
      </div>
    </motion.div>
  );
}

export type Match2Stats = {
  winner: string;        // abbreviated, e.g. "B. Muhammad"
  winnerPct: number;     // model confidence %, e.g. 58
  confidence: string;    // e.g. "7.0/10"
  aStrAcc: number; aTdDef: number;   // left fighter (A)
  bStrAcc: number; bTdDef: number;   // right fighter (B)
  s1: number[]; s2: number[]; sigDelta: number; // significant-strikes chart
};

export function HeroFightAnimation({ sections = [], match2Info, match2 }: { sections?: ReactNode[]; match2Info?: ReactNode; match2?: Match2Stats }) {
  // Build the match-2 (real event) showcase cards from live data, with the
  // original demo numbers as a fallback when no real matchup is supplied.
  const eventCards: StatCardDef[] = [
    { ...EVENT_STAT_CARDS[0], value: match2?.aStrAcc ?? EVENT_STAT_CARDS[0].value },
    { ...EVENT_STAT_CARDS[1], value: match2?.aTdDef ?? EVENT_STAT_CARDS[1].value },
    { ...EVENT_STAT_CARDS[2], value: match2?.bStrAcc ?? EVENT_STAT_CARDS[2].value },
    { ...EVENT_STAT_CARDS[3], value: match2?.bTdDef ?? EVENT_STAT_CARDS[3].value },
  ];
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef   = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });

  // One pinned stage. Progress 0→1 drives the whole scroll story so every
  // "tab" shares the same background — content swaps in the same left region.
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  // Timed slide duration for the left content (the "surge"). Independent of scroll.
  const PANEL_SLIDE = 0.7;

  const [tab, setTab] = useState(0);
  const [s2Active, setS2Active] = useState(false);

  // ── Mobile splits each fight into a SHOWCASE step (fighters + hovering stats,
  //    no text) and an INFO step (text, fighters gone) so the assets are never
  //    buried behind text. Desktop keeps fighters + text together, side by side.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const u = () => setIsMobile(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);

  // Tab layout — desktop: [f1, f2, …panels, footer].
  //              mobile:  [f1-show, f1-info, f2-show, f2-info, …panels, footer].
  const FIGHT_TABS = isMobile ? 4 : 2;
  const HERO_TABS = FIGHT_TABS + sections.length;
  const N = HERO_TABS + 1;          // + footer tab
  const panelBase = FIGHT_TABS;     // index of the first panel tab

  // Per-layer visibility (branches mobile vs desktop).
  const showF1     = tab === 0;                          // match 1 fighters + stats
  const showF1Text = isMobile ? tab === 1 : tab === 0;   // Bet Smarter text
  const showF2     = isMobile ? tab === 2 : tab >= 1;    // match 2 fighters + stats (desktop: backdrop)
  const showF2Text = isMobile ? tab === 3 : tab === 1;   // match 2 info text

  const tabRef = useRef(0);
  const lockRef = useRef(false);
  const goToRef = useRef<(i: number) => void>(() => {});
  useEffect(() => { tabRef.current = tab; }, [tab]);
  // Latch match-2 entry animations right when its showcase first appears.
  useEffect(() => { if (tab >= (isMobile ? 2 : 1)) setS2Active(true); }, [tab, isMobile]);

  useEffect(() => {
    // Always start on match 1 (don't let the browser restore a mid-page scroll).
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // One stable scroll frame per hero tab (content is tab-driven, so exact
    // positions only need to be distinct points within the pinned range).
    const heroProgress = Array.from({ length: HERO_TABS }, (_, i) => 0.04 + (i / HERO_TABS) * 0.9);
    const scrollableVh = HERO_TABS * 0.85 - 1;          // hero container is HERO_TABS*85vh tall

    const footerTop = () => HERO_TABS * 0.85 * window.innerHeight; // top of the page footer
    const targetTop = (i: number) =>
      i >= HERO_TABS
        ? footerTop()                                                       // footer tab = footer top
        : heroProgress[i] * scrollableVh * window.innerHeight;              // hero frame
    const SCROLL_SECONDS = 0.7; // how long the canvas takes to settle on the next tab
    const goto = (i: number) => {
      const clamped = Math.max(0, Math.min(N - 1, i));
      setTab(clamped);
      tabRef.current = clamped;
      // Custom timed scroll (forced instant per frame) so we control the speed —
      // the browser's default smooth-scroll is fixed and too fast.
      fmAnimate(window.scrollY, targetTop(clamped), {
        duration: SCROLL_SECONDS,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => window.scrollTo({ top: v, behavior: "instant" as ScrollBehavior }),
      });
    };
    const tryStep = (dir: number) => {
      const next = tabRef.current + dir;
      if (next < 0 || next > N - 1) return; // clamped at an end → no native scroll
      if (lockRef.current) return;
      lockRef.current = true;
      goto(next);
      window.setTimeout(() => { lockRef.current = false; }, SCROLL_SECONDS * 1000 + 80);
    };
    goToRef.current = goto; // expose for tappable dots
    const onWheel = (e: WheelEvent) => {
      // On the footer tab, let the (possibly tall) footer scroll natively;
      // scrolling up at its top steps back to the last hero tab.
      if (tabRef.current >= HERO_TABS) {
        if (e.deltaY < 0 && window.scrollY <= footerTop() + 8) { e.preventDefault(); tryStep(-1); }
        return;
      }
      e.preventDefault();                       // fully own the wheel — no over-scroll drift
      tryStep(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      let dir = 0;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) dir = 1;
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) dir = -1;
      else return;
      e.preventDefault();
      tryStep(dir);
    };

    // ── Touch (mobile): swipe up/down to change tab. Native scroll is owned by
    //    us, except inside an element marked [data-hero-scroll] that can still
    //    scroll (so long tab content remains readable).
    let tStartY = 0, tStartX = 0, panned = false;
    const scrollableUnder = (target: EventTarget | null) => {
      const node = target instanceof Element ? target : null;        // guard non-elements
      const el = node?.closest("[data-hero-scroll]") as HTMLElement | null;
      return el && el.scrollHeight > el.clientHeight + 2 ? el : null;
    };
    const onTouchStart = (e: TouchEvent) => {
      tStartY = e.touches[0].clientY; tStartX = e.touches[0].clientX; panned = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (tabRef.current >= HERO_TABS) return;                 // footer: native scroll
      const el = scrollableUnder(e.target);
      if (el) {
        const dy = e.touches[0].clientY - tStartY;             // >0 swipe down, <0 swipe up
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        // Let the panel scroll while it still has room in the swipe direction;
        // only capture the gesture for a tab change once it's at the edge.
        if ((dy < 0 && !atBottom) || (dy > 0 && !atTop)) { panned = true; return; }
      }
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - tStartY;
      const dx = e.changedTouches[0].clientX - tStartX;
      const swipe = Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx);
      // On the footer tab, only a downward swipe at the footer top goes back.
      if (tabRef.current >= HERO_TABS) {
        if (swipe && dy > 0 && window.scrollY <= footerTop() + 8) tryStep(-1);
        return;
      }
      if (panned) return;
      if (swipe) tryStep(dy < 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [N, HERO_TABS, sections.length]);

  return (
    <div ref={containerRef} className="-mt-16" style={{ height: `${HERO_TABS * 85}vh` }}>
      <motion.section ref={sectionRef} className="sticky top-0 z-0 h-screen overflow-hidden">

        {/* RIGHT (desktop) / FULL-WIDTH SHOWCASE (mobile): fighter composition.
            Desktop: match 2 stays as the backdrop. Mobile: each fight's fighters +
            stats show on their showcase step only, then leave for the info step. */}
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-full lg:w-[65%]">

          {/* Match 1 fighters + stats */}
          <motion.div className="absolute inset-0"
            initial={false}
            animate={{ y: showF1 ? 0 : 56, opacity: showF1 ? 1 : 0 }}
            transition={{ y: { duration: PANEL_SLIDE, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0 } }}>
            {isMobile ? (
              // Mobile: all six features as a 3×2 grid, the X mark below them.
              <div className="flex h-full flex-col px-3 pb-9 pt-[4.6rem]">
                <div className="grid grid-cols-3 gap-2">
                  {FEATURES.map((f, i) => (
                    <motion.div key={f.title}
                      initial={{ opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-line/70 bg-bg/85 px-1.5 py-2.5 text-center backdrop-blur-md">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-blood/30 bg-blood/10">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e10600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                      </span>
                      <p className="text-[9px] font-bold uppercase leading-[1.15] text-fg">{f.title}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div className="relative mt-3 flex-1"
                  initial={{ scale: 0.85, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                  <motion.div className="absolute inset-0"
                    animate={inView ? { y: [0, -10, 0, 10, 0] } : {}}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
                    <Image src="/ui/hero-x-logo.png" alt="FightVex" fill sizes="90vw" priority className="object-contain" />
                  </motion.div>
                </motion.div>
              </div>
            ) : (
              <>
                {/* 3D X brand mark, centered, with FightVex features hovering around it */}
                <HeroLogo active={inView} />
                {FEATURES.map((f) => <FeatureCard key={f.title} f={f} active={inView} mobile={isMobile} />)}
              </>
            )}
          </motion.div>

          {/* Match 2 fighters + stats */}
          <motion.div className="absolute inset-0"
            initial={false}
            animate={{ y: showF2 ? 0 : 56, opacity: showF2 ? 1 : 0 }}
            transition={{ y: { duration: PANEL_SLIDE, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0 } }}>
            {/* Fighters enlarged on mobile (anchored bottom) so they fill the frame */}
            <div className="absolute inset-0 origin-bottom scale-[2.3] -translate-y-[14%] lg:translate-y-0 lg:scale-100">
              {EVENT_LAYERS.map(l => <AnimLayer key={l.src} layer={l} active={s2Active} />)}
            </div>
            {/* Stats hover around the fighters (mobile uses compact positions) */}
            <div className="absolute inset-0">
              {eventCards.map(c => <StatCard key={c.label+c.pos} card={c} active={s2Active} mobile={isMobile} />)}
              <PredictedWinnerCard active={s2Active} winner={match2?.winner ?? "D. Morales"} pct={match2?.winnerPct ?? 59} confidence={match2?.confidence ?? "7.2/10"} mobile={isMobile} />
              <StrikesChartCard active={s2Active} s1={match2?.s1 ?? [32,48,42,55,60]} s2={match2?.s2 ?? [28,22,35,30,25]} deltaTarget={match2?.sigDelta ?? 18} mobile={isMobile} />
            </div>
          </motion.div>
        </div>

        {/* LEFT: Bet Smarter text. Desktop: with match 1. Mobile: its own info step. */}
        <motion.div
          className={`relative z-10 px-4 sm:pl-6 sm:pr-0 ${showF1Text ? "" : "hidden"}`}
          initial={false}
          animate={{ y: showF1Text ? 0 : 48 }}
          transition={{ duration: PANEL_SLIDE, ease: [0.16, 1, 0.3, 1] }}
        >
          <div data-hero-scroll className="max-h-[calc(100svh-1rem)] max-w-[520px] overflow-y-auto overscroll-contain pb-10 pt-20 sm:pt-16 lg:max-h-none lg:overflow-visible lg:pt-24">
            <motion.h1 className="font-display text-4xl font-black uppercase italic leading-[0.92] tracking-tight sm:text-6xl lg:text-[72px]"
              initial={{ opacity: 0, y: 56, scale: 0.97 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: 0.1, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}>
              <span className="title-silver">Bet Smarter</span><br />
              <span className="whitespace-nowrap italic text-blood">On Fight Night.</span>
            </motion.h1>
            <motion.p className="mt-4 max-w-[380px] text-sm leading-relaxed text-muted sm:text-base"
              initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.26, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}>
              AI-powered UFC analytics, matchup insights, and betting intelligence for sharper picks.
            </motion.p>
            <motion.div className="mt-7 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 34 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.40, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <Link href="/simulator" className="btn-flare flex items-center gap-2 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-wide">
                <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden><path d="M1 1l8 5-8 5V1z"/></svg>
                View Demo
              </Link>
              <Link href="/pricing" className="rounded-md border border-line bg-transparent px-6 py-3 text-sm font-bold uppercase tracking-wide text-fg hover:border-steel">
                Get Started
              </Link>
            </motion.div>
            <motion.div className="mt-5 flex flex-wrap gap-x-4 gap-y-2"
              initial={{ opacity: 0, y: 26 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.52, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}>
              {["Vex AI Predictions","Live Odds Signals","Fighter Metrics","Betting Edge"].map(f=>(
                <span key={f} className="flex items-center gap-1.5 text-[11px] text-muted">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <circle cx="5" cy="5" r="4.5" stroke="#e10600" strokeWidth="1"/>
                    <path d="M3 5l1.5 1.5L7 3.5" stroke="#e10600" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>{f}
                </span>
              ))}
            </motion.div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[{v:"Real",l:"Data, Trusted Sources",d:0.62},{v:"100%",l:"Transparent Model",d:0.74},{v:"1000s",l:"Monte-Carlo Sims",d:0.86},{v:"Live",l:"Market Odds",d:0.98}].map(s=>(
                <motion.div key={s.l} className="rounded-lg border border-line/60 bg-bg/70 px-3 py-3 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 28, scale: 0.94 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ delay: s.d, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                  <p className="font-display text-xl font-bold text-fg">{s.v}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{s.l}</p>
                </motion.div>
              ))}
            </div>
            <motion.p className="mt-4 text-[10px] uppercase tracking-widest text-faint"
              initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
              21+ For entertainment and research. Not betting advice.
            </motion.p>
          </div>
        </motion.div>

        {/* LEFT (match 2 / tab 1): real event info on the two fighters, same fonts. */}
        {match2Info && (
          <motion.div
            className={`relative z-10 px-4 sm:pl-6 sm:pr-0 ${showF2Text ? "" : "hidden"}`}
            initial={false}
            animate={{ y: showF2Text ? 0 : 48 }}
            transition={{ duration: PANEL_SLIDE, ease: [0.16, 1, 0.3, 1] }}
          >
            {match2Info}
          </motion.div>
        )}

        {/* LEFT overlays: Fight Card / Fighters / Research — same region & background.
            Each is the active tab (tab index i+2); the last one stays active through
            the footer tab so it doesn't vanish while the canvas scrolls away. */}
        {sections.map((section, i) => {
          const isLast = i === sections.length - 1;
          const active = isLast ? tab >= panelBase + i : tab === panelBase + i;
          return (
            <PanelOverlay key={i} active={active} duration={PANEL_SLIDE}>
              {section}
            </PanelOverlay>
          );
        })}

        {/* Progress dots — tappable on touch, reflect the active tab */}
        <div className="absolute right-2.5 sm:right-5 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2.5">
          {Array.from({ length: N }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to section ${i + 1}`}
              onClick={() => goToRef.current(i)}
              className="grid place-items-center p-1.5"
            >
              <span className={`block rounded-full transition-all duration-300 ${tab === i ? "h-2.5 w-2.5 bg-blood" : "h-1.5 w-1.5 bg-steel/50"}`} />
            </button>
          ))}
        </div>

        {/* Hint */}
        <motion.p
          className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-faint"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.06], [1, 0]) }}
        >
          <span className="lg:hidden">swipe to explore</span>
          <span className="hidden lg:inline">scroll to explore</span>
        </motion.p>

      </motion.section>
    </div>
  );
}


