"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Fighter, Matchup } from "@/lib/types";
import { Flag } from "@/components/ui/Flag";
import { ModelTag } from "@/components/ui/ModelTag";
import { Badge } from "@/components/ui/Badge";
import { bestPrice, cmToFtIn, cmToIn, fmtOdds, recordString, signClass, confidenceLabel } from "@/lib/format";

const EASE = [0.4, 0, 0.2, 1] as const;

type Pick = { side: "a" | "b"; lastName: string; prob: number } | null;

function rankLabel(f: Fighter): string {
  if (f.title || f.champion) return "Champion";
  return f.ranking != null ? `#${f.ranking}` : "Unranked";
}

// ---- tale-of-the-tape rows per tab ----
type Row = { k: string; a: string | number; b: string | number; lowerBetter?: boolean; estimate?: boolean; noCompare?: boolean };
function tabRows(tab: string, a: Fighter, b: Fighter): Row[] {
  switch (tab) {
    case "Win By":
      return [
        { k: "KO / TKO", a: a.record.ko, b: b.record.ko },
        { k: "Submission", a: a.record.sub, b: b.record.sub },
        { k: "Decision", a: a.record.dec, b: b.record.dec },
        { k: "Finish Rate", a: `${a.stats.finishRate}%`, b: `${b.stats.finishRate}%` },
      ];
    case "Significant Strikes":
      return [
        { k: "Strikes Landed / Min", a: a.stats.slpm, b: b.stats.slpm, estimate: true },
        { k: "Striking Accuracy", a: `${a.stats.strAcc}%`, b: `${b.stats.strAcc}%`, estimate: true },
        { k: "Strikes Absorbed / Min", a: a.stats.sapm, b: b.stats.sapm, lowerBetter: true, estimate: true },
        { k: "Striking Defense", a: `${a.stats.strDef}%`, b: `${b.stats.strDef}%`, estimate: true },
        { k: "Knockdowns / 15", a: a.stats.kdAvg, b: b.stats.kdAvg, estimate: true },
      ];
    case "Grappling":
      return [
        { k: "Takedowns / 15", a: a.stats.tdAvg, b: b.stats.tdAvg, estimate: true },
        { k: "Takedown Accuracy", a: `${a.stats.tdAcc}%`, b: `${b.stats.tdAcc}%`, estimate: true },
        { k: "Takedown Defense", a: `${a.stats.tdDef}%`, b: `${b.stats.tdDef}%`, estimate: true },
        { k: "Sub Attempts / 15", a: a.stats.subAvg, b: b.stats.subAvg, estimate: true },
        { k: "Control / 15 (min)", a: a.stats.ctrl, b: b.stats.ctrl, estimate: true },
      ];
    default: // Matchup Stats
      return [
        { k: "Record", a: recordString(a.record), b: recordString(b.record) },
        { k: "Ranking", a: rankLabel(a), b: rankLabel(b) },
        { k: "Country", a: a.country || "N/A", b: b.country || "N/A" },
        { k: "Age", a: a.age || "N/A", b: b.age || "N/A", noCompare: true },
        { k: "Height", a: a.heightCm ? cmToFtIn(a.heightCm) : "N/A", b: b.heightCm ? cmToFtIn(b.heightCm) : "N/A" },
        { k: "Reach", a: a.reachCm ? cmToIn(a.reachCm) : "N/A", b: b.reachCm ? cmToIn(b.reachCm) : "N/A" },
        { k: "Stance", a: a.stance, b: b.stance },
      ];
  }
}

const TABS = ["Matchup Stats", "Win By", "Significant Strikes", "Grappling"];

function leaderOf(r: Row): "a" | "b" | null {
  if (r.noCompare) return null;
  const pa = parseFloat(String(r.a));
  const pb = parseFloat(String(r.b));
  if (Number.isNaN(pa) || Number.isNaN(pb) || pa === pb) return null;
  const aWins = r.lowerBetter ? pa < pb : pa > pb;
  return aWins ? "a" : "b";
}

function MaximizeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}
function MinimizeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 14h6v6M14 10h6V4M14 10l7-7M3 21l7-7" />
    </svg>
  );
}

// A fighter image whose BOTTOM EDGE always sits on the divider beneath it
// (object-bottom + self-end) so the fighter "stands on the line" rather than
// floating. `src` lets the open card swap in a waist-up torso shot (same framing
// as the simulator hero, so the fighter fills the frame top-to-bottom rather than
// shrinking to a thin full-body figure); otherwise the headshot (or silhouette)
// is used. No coloured backdrop.
function Portrait({ f, side, size, src }: { f: Fighter; side: "a" | "b"; size: "sm" | "lg"; src?: string }) {
  const dim = size === "lg" ? "h-52 w-36 sm:h-72 sm:w-52" : "h-24 w-20";
  const img = src ?? f.image ?? "/fighters/unknown-v5.png";
  const isSilhouette = img === "/fighters/unknown-v5.png";
  return (
    <div className={`relative ${dim} shrink-0 self-end`}>
      <Image
        src={img}
        alt={isSilhouette ? "" : f.name}
        fill
        sizes="240px"
        className={`object-contain object-bottom ${isSilhouette && side === "b" ? "-scale-x-100" : ""}`}
      />
    </div>
  );
}

function OddsBar({ a, b, oddsA, oddsB, oddsSource }: { a: Fighter; b: Fighter; oddsA: number | null; oddsB: number | null; oddsSource?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line bg-bg/50 px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <Flag emoji={a.flag} country={a.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
        <span className="truncate">{a.country || "—"}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3 sm:gap-4">
        <span className={`tnum text-sm font-bold ${oddsA != null ? signClass(oddsA) : "text-faint"}`}>{oddsA != null ? fmtOdds(oddsA) : "—"}</span>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-faint" onClick={(e) => e.stopPropagation()}>
          Odds {oddsSource ? <ModelTag kind="market" source={oddsSource} /> : <ModelTag kind="odds" />}
        </span>
        <span className={`tnum text-sm font-bold ${oddsB != null ? signClass(oddsB) : "text-faint"}`}>{oddsB != null ? fmtOdds(oddsB) : "—"}</span>
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span className="truncate">{b.country || "—"}</span>
        <Flag emoji={b.flag} country={b.country} className="h-3 w-[18px] shrink-0 rounded-[2px] border border-black/40" />
      </span>
    </div>
  );
}

export function FightCard({ a, b, matchup, pick, bodyA, bodyB }: { a: Fighter; b: Fighter; matchup: Matchup; pick: Pick; bodyA?: string; bodyB?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(TABS[0]);

  const oddsA = matchup.odds.length ? bestPrice(matchup.odds.map((o) => o.priceA)) : null;
  const oddsB = matchup.odds.length ? bestPrice(matchup.odds.map((o) => o.priceB)) : null;
  const label = `${matchup.weightClass || "Catchweight"} Bout`;
  const rows = tabRows(tab, a, b);
  // "Significant Strikes" / "Grappling" are computed from official ESPN per-fight
  // statistics. Only show them when BOTH fighters have that real data; otherwise
  // blank them (no estimates) and say so.
  const deepTab = rows.some((r) => r.estimate);
  const statsReal = a.statsReal && b.statsReal;

  return (
    <div id={matchup.id}>
      <article className="panel overflow-hidden rounded-2xl border border-line">
        {/* ---------- COLLAPSED ---------- */}
        {!open && (
          <div
            role="button"
            tabIndex={0}
            aria-expanded={false}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
            className="group block w-full cursor-pointer text-left"
          >
            <div className="relative px-4 pt-4">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
              {matchup.isTitle && (
                <span className="absolute left-3 top-3"><Badge variant="amber">★ Title</Badge></span>
              )}
              <span className="absolute right-3 top-3 text-faint transition-colors group-hover:text-fg"><MaximizeIcon /></span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-end gap-1 px-3 pb-0 pt-2 sm:gap-3 sm:px-4">
              <Portrait f={a} side="a" size="sm" />
              <div className="min-w-0 self-center pb-3 text-left">
                <p className="tnum text-sm font-bold text-muted">{rankLabel(a)}</p>
                <p className="break-words font-display text-base font-bold uppercase leading-[1.05] text-fg sm:text-xl">{a.name}</p>
              </div>
              <span className="self-center px-1 pb-3 font-display text-sm font-black text-faint">VS</span>
              <div className="min-w-0 self-center pb-3 text-right">
                <p className="tnum text-sm font-bold text-muted">{rankLabel(b)}</p>
                <p className="break-words font-display text-base font-bold uppercase leading-[1.05] text-fg sm:text-xl">{b.name}</p>
              </div>
              <Portrait f={b} side="b" size="sm" />
            </div>

            <OddsBar a={a} b={b} oddsA={oddsA} oddsB={oddsB} oddsSource={matchup.oddsSource} />
          </div>
        )}

        {/* ---------- EXPANDED ---------- */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.22 } }}
              style={{ overflow: "hidden" }}
            >
              {/* header: names + center label + collapse */}
              <div className="relative border-b border-line px-5 pb-3 pt-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Collapse"
                  className="absolute right-3 top-3 text-faint transition-colors hover:text-fg"
                >
                  <MinimizeIcon />
                </button>
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
                  <div className="group min-w-0">
                    <Link href={`/fighters/${a.slug}`} className="inline-block max-w-full break-words font-display text-lg font-black uppercase leading-none text-fg transition-colors group-hover:text-blood sm:text-2xl">
                      {a.name}
                    </Link>
                    <span className="mt-1.5 block h-[3px] w-12 rounded-full bg-fg/20 transition-colors group-hover:bg-blood" />
                  </div>
                  <p className="px-2 pt-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted sm:text-[11px]">{label}</p>
                  <div className="group min-w-0 pr-7 text-right">
                    <Link href={`/fighters/${b.slug}`} className="inline-block max-w-full break-words font-display text-lg font-black uppercase leading-none text-fg transition-colors group-hover:text-blue sm:text-2xl">
                      {b.name}
                    </Link>
                    <span className="ml-auto mt-1.5 block h-[3px] w-12 rounded-full bg-fg/20 transition-colors group-hover:bg-blue" />
                  </div>
                </div>
              </div>

              {/* body: waist-up portrait | tabs+rows | waist-up portrait.
                  items-end keeps each fighter standing on the odds-bar divider below. */}
              <div className="grid grid-cols-1 items-end gap-3 px-5 pt-5 sm:grid-cols-[auto_1fr_auto] sm:gap-5">
                <div className="hidden sm:block"><Portrait f={a} side="a" size="lg" src={bodyA} /></div>

                <div className="min-w-0 pb-5">
                  {/* tabs */}
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line pb-2">
                    {TABS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`relative pb-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          tab === t ? "text-fg" : "text-faint hover:text-muted"
                        }`}
                      >
                        {t}
                        {tab === t && <span className="absolute inset-x-0 -bottom-[9px] h-[2px] rounded-full bg-blood" />}
                      </button>
                    ))}
                  </div>

                  {/* rows */}
                  <div className="overflow-hidden rounded-lg border border-line">
                    {rows.map((r, i) => {
                      const blank = !!r.estimate && !statsReal; // deep stat without real ESPN data
                      const lead = blank ? null : leaderOf(r);
                      const va = blank ? "—" : r.a;
                      const vb = blank ? "—" : r.b;
                      return (
                        <div key={r.k} className={`grid grid-cols-[1fr_auto_1fr] items-center ${i % 2 ? "bg-panel-2/25" : ""}`}>
                          <span className={`tnum px-3 py-2 text-left text-sm ${lead === "a" ? "font-bold text-fg" : "text-fg/70"}`}>{va}</span>
                          <span className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-muted sm:text-[10px]">{r.k}</span>
                          <span className={`tnum px-3 py-2 text-right text-sm ${lead === "b" ? "font-bold text-fg" : "text-fg/70"}`}>{vb}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* meta row: title/rounds + estimate note + Vex pick */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {matchup.isTitle && <Badge variant="amber">★ Title</Badge>}
                      <Badge variant="steel">{matchup.rounds} rounds</Badge>
                    </span>
                    {deepTab ? (
                      statsReal ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                          ESPN per-fight stats <ModelTag kind="espn" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">No ESPN per-fight stats</span>
                      )
                    ) : pick ? (
                      <span className="text-[11px] text-muted">
                        Vex AI: <span className="font-bold text-fg">{pick.lastName}</span>{" "}
                        <span className="text-edge">{confidenceLabel(pick.prob)}</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Run this exact matchup in the simulator — both fighters preselected. */}
                  <Link
                    href={`/simulator?a=${a.id}&b=${b.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="btn-flare mt-4 flex w-full items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold uppercase tracking-wide"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                    Simulate Fight
                  </Link>
                </div>

                <div className="hidden sm:block"><Portrait f={b} side="b" size="lg" src={bodyB} /></div>
              </div>

              <OddsBar a={a} b={b} oddsA={oddsA} oddsB={oddsB} oddsSource={matchup.oddsSource} />
            </motion.div>
          )}
        </AnimatePresence>
      </article>
    </div>
  );
}
