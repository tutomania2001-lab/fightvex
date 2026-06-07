"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Fighter } from "@/lib/types";
import { FighterAvatar } from "../fighter/FighterAvatar";
import { Flag } from "../ui/Flag";
import { Badge } from "../ui/Badge";
import { bodyFor } from "@/lib/data/bodies.generated";
import { recordString } from "@/lib/format";

// Division order + short chip labels (mirrors the Fighters/Roster tab).
const DIVISIONS: { wc: string; short: string }[] = [
  { wc: "Flyweight", short: "FLY" },
  { wc: "Bantamweight", short: "BW" },
  { wc: "Featherweight", short: "FW" },
  { wc: "Lightweight", short: "LW" },
  { wc: "Welterweight", short: "WW" },
  { wc: "Middleweight", short: "MW" },
  { wc: "Light Heavyweight", short: "LHW" },
  { wc: "Heavyweight", short: "HW" },
  { wc: "Women's Strawweight", short: "W-SW" },
  { wc: "Women's Flyweight", short: "W-FLY" },
  { wc: "Women's Bantamweight", short: "W-BW" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Side = "A" | "B";

// Full-height corner preview (red = A, blue = B). Click to aim the next pick at it.
// `f` may be undefined when that corner has no fighter chosen yet — then we show
// the same SOLID-BLACK random-body silhouette the simulator hero uses (via
// `placeholder`), mirrored inward on the blue side, NOT the old grey cutout.
function CornerPreview({ f, placeholder, side, active, onClick, className = "" }: {
  f?: Fighter; placeholder?: Fighter; side: Side; active: boolean; onClick: () => void; className?: string;
}) {
  const isA = side === "A";
  const empty = !f;
  const img = f
    ? (bodyFor(f.slug) ?? f.image ?? "/fighters/unknown-v5.png")
    : (placeholder ? (bodyFor(placeholder.slug) ?? placeholder.image ?? "/fighters/unknown-v5.png") : "/fighters/unknown-v5.png");
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-xl text-left transition-all ${className}`}
    >
      <div className="relative z-10 px-3 pt-3 text-center" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.8)" }}>
        <span className={`flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${isA ? "text-blood" : "text-blue"}`}>
          {f && <Flag emoji={f.flag} country={f.country} className="h-3 w-[18px] rounded-[2px]" />} {isA ? "Red" : "Blue"} Corner
        </span>
        <p className="mt-1 line-clamp-2 font-display text-sm font-black uppercase leading-tight text-white">{f ? f.name : "Select a fighter"}</p>
        <p className="tnum mt-0.5 text-[11px] font-semibold text-fg">{f ? recordString(f.record) : "—"}</p>
        <p className="truncate text-[9px] uppercase tracking-wider text-muted">{f ? f.weightClass : "Tap a fighter below"}</p>
      </div>
      {/* object-contain NEVER crops — the whole fighter always stays in frame.
          The wide corner columns keep even wide stances near full height, so
          sizes stay consistent without anyone getting cut off. */}
      <div className="relative z-10 mt-1 flex min-h-[120px] flex-1 items-end justify-center overflow-hidden">
        <Image src={img} alt={f?.name ?? ""} fill sizes="240px" className={`object-contain object-bottom ${empty ? `brightness-0 drop-shadow-[0_0_2px_rgba(255,255,255,0.35)] ${isA ? "" : "-scale-x-100"}` : ""}`} />
      </div>
      <span className={`relative z-10 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest ${active ? (isA ? "text-blood" : "text-blue") : "text-faint"}`}>
        {active ? "◖ Selecting ◗" : "Tap to aim"}
      </span>
    </button>
  );
}

// Compact corner chip used on small screens (where the tall previews are hidden).
// `f` may be undefined when that corner has no fighter chosen yet (manual flow).
function CornerChip({ f, side, active, onClick }: { f?: Fighter; side: Side; active: boolean; onClick: () => void }) {
  const isA = side === "A";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border border-line p-2 text-left transition-all ${active ? (isA ? "bg-blood/10" : "bg-blue/10") : ""}`}
    >
      {f ? (
        <FighterAvatar fighter={f} size="sm" className="h-9 w-9 shrink-0" />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-full border border-line bg-panel-2" />
      )}
      <div className="min-w-0">
        <p className={`text-[9px] font-bold uppercase tracking-widest ${isA ? "text-blood" : "text-blue"}`}>{isA ? "Red" : "Blue"}</p>
        <p className="truncate font-display text-xs font-bold uppercase leading-tight">{f ? f.name : "Select"}</p>
      </div>
    </button>
  );
}

export function FighterPicker({
  fighters,
  aId,
  bId,
  placeholderA,
  placeholderB,
  firstTarget = "A",
  onSetA,
  onSetB,
  onClose,
}: {
  fighters: Fighter[];
  aId: string;
  bId: string;
  /** Random-body silhouettes shown for an as-yet-unpicked corner (matches the hero). */
  placeholderA?: Fighter;
  placeholderB?: Fighter;
  /** Which corner the next pick fills first (the side the user clicked). */
  firstTarget?: Side;
  onSetA: (id: string) => void;
  onSetB: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [div, setDiv] = useState<string | null>(null);
  const [target, setTarget] = useState<Side>(firstTarget);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // May be undefined in the manual flow (no fighter chosen for that corner yet).
  const a = fighters.find((f) => f.id === aId);
  const b = fighters.find((f) => f.id === bId);

  const list = useMemo(() => {
    const t = norm(q.trim());
    let l = fighters;
    if (div) l = l.filter((f) => f.weightClass === div);
    if (t) l = l.filter((f) => norm(f.name).includes(t) || (f.nickname && norm(f.nickname).includes(t)));
    return [...l].sort((x, y) => (x.ranking ?? 999) - (y.ranking ?? 999) || x.name.localeCompare(y.name));
  }, [fighters, q, div]);

  // Assign a fighter to the current target corner, then aim at the other corner so
  // the next pick fills it. Picking the fighter already in the OTHER corner swaps
  // them (never the same fighter on both sides). Replacing always hits the corner
  // that was set least-recently (the "old" one).
  const assign = (id: string) => {
    const otherId = target === "A" ? bId : aId;
    if (id === otherId) {
      if (target === "A") { onSetA(id); onSetB(aId); } else { onSetB(id); onSetA(bId); }
    } else if (target === "A") {
      onSetA(id);
    } else {
      onSetB(id);
    }
    setTarget((s) => (s === "A" ? "B" : "A"));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flair-rb-lg mt-[3vh] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold uppercase">Select Fighters</h3>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${target === "A" ? "border-blood/50 bg-blood/10 text-blood" : "border-blue/50 bg-blue/10 text-blue"}`}>
              Selecting {target === "A" ? "Red" : "Blue"} corner
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-fg">✕</button>
        </div>

        {/* body: red corner | search + list | blue corner */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[230px_minmax(0,1fr)_230px]">
          <CornerPreview f={a} placeholder={placeholderA} side="A" active={target === "A"} onClick={() => setTarget("A")} className="hidden md:flex" />

          <div className="flex min-h-0 flex-col">
            {/* mobile corner chips */}
            <div className="mb-2 grid grid-cols-2 gap-2 md:hidden">
              <CornerChip f={a} side="A" active={target === "A"} onClick={() => setTarget("A")} />
              <CornerChip f={b} side="B" active={target === "B"} onClick={() => setTarget("B")} />
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fighters by name or nickname…"
              autoFocus
              className="w-full rounded-md border border-line bg-bg px-3 py-2.5 text-sm text-fg outline-none placeholder:text-faint focus:border-steel"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setDiv(null)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${div === null ? "border-fg/40 bg-fg/10 text-fg" : "border-line text-muted hover:text-fg"}`}>All</button>
              {DIVISIONS.map((d) => (
                <button key={d.wc} type="button" onClick={() => setDiv(d.wc)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${div === d.wc ? "border-fg/40 bg-fg/10 text-fg" : "border-line text-muted hover:text-fg"}`}>{d.short}</button>
              ))}
            </div>

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              {list.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">No fighters match “{q}”.</p>
              ) : (
                <ul className="space-y-0.5">
                  {list.map((f) => {
                    const isAsel = f.id === aId;
                    const isBsel = f.id === bId;
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => assign(f.id)}
                          className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${isAsel ? "bg-blood/15" : isBsel ? "bg-blue/15" : "hover:bg-panel-2/70"}`}
                        >
                          <div className="relative h-11 w-11 shrink-0">
                            <FighterAvatar fighter={f} size="md" className="h-full w-full" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-bold uppercase leading-tight">{f.name}</p>
                            <p className="tnum text-[11px] text-muted">{recordString(f.record)} · {f.weightClass}</p>
                          </div>
                          {isAsel ? (
                            <Badge variant="blood">● Red</Badge>
                          ) : isBsel ? (
                            <Badge variant="blue">● Blue</Badge>
                          ) : f.title ? (
                            <Badge variant="amber">★ Champ</Badge>
                          ) : f.ranking != null ? (
                            <Badge variant="steel">#{f.ranking}</Badge>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <CornerPreview f={b} placeholder={placeholderB} side="B" active={target === "B"} onClick={() => setTarget("B")} className="hidden md:flex" />
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-faint">
          <span>{list.length} fighter{list.length === 1 ? "" : "s"}</span>
          <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1 font-semibold text-fg transition-colors hover:border-steel">Done</button>
        </div>
      </div>
    </div>
  );
}
