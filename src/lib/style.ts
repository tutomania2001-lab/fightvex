// ============================================================
// FightVex — stat-based STYLE READ.
//
// Reads a fighter's fighting style from their REAL career statistics (the same
// box-score numbers shown on their profile) and names the archetype. This is a
// transparent, explainable read — NOT a claim that the model watched footage.
// It powers the "styles make fights" insight in the simulator.
// ============================================================
import type { Fighter, FighterStats } from "./types";

export type Archetype = { key: string; label: string; blurb: string };

// Score each archetype from the stats and take the strongest. Inputs are
// normalized to ~0–1 so the weights are comparable across very different stats.
export function archetypeFor(f: Fighter): Archetype {
  const s: FighterStats = f.stats;
  const n = (v: number, hi: number) => Math.max(0, Math.min(1, v / hi));
  const volume = n(s.slpm, 6);           // strikes landed / min
  const power = n(s.kdAvg, 0.8);         // knockdowns / 15min
  const acc = n(s.strAcc, 60);           // striking accuracy %
  const strDef = n(s.strDef, 65);        // striking defense %
  const td = n(s.tdAvg, 4);              // takedowns / 15min
  const ctrl = n(s.ctrl, 5);             // control min / 15min
  const sub = n(s.subAvg, 1.5);          // sub attempts / 15min
  const grapple = (td + ctrl) / 2;

  const cands: (Archetype & { score: number })[] = [
    { key: "submission", label: "Submission Grappler", blurb: "Drags it to the mat and hunts the finish", score: sub * 1.7 + grapple * 0.7 },
    { key: "wrestler", label: "Wrestle-Grinder", blurb: "Takedowns and smothering top control", score: grapple * 1.6 + n(s.tdDef, 80) * 0.2 - sub * 0.5 },
    { key: "ko", label: "Knockout Artist", blurb: "Fight-ending power on the feet", score: power * 1.6 + volume * 0.25 - grapple * 0.4 },
    { key: "pressure", label: "Pressure Striker", blurb: "Relentless forward volume", score: volume * 1.5 + acc * 0.2 - grapple * 0.4 },
    { key: "counter", label: "Counter Striker", blurb: "Patient defense, precise counters", score: strDef * 1.4 + acc * 0.5 - volume * 0.3 - grapple * 0.3 },
    { key: "rounded", label: "Well-Rounded", blurb: "No glaring holes — dangerous everywhere", score: 0.55 + Math.min(volume, grapple) * 0.6 },
  ];
  return cands.reduce((a, b) => (b.score > a.score ? b : a));
}

// A one-line "styles make fights" read for a matchup. Uses the orientation gap
// (striker vs grappler) plus the obvious stylistic mismatch, derived from stats.
export function styleMatchup(a: Fighter, b: Fighter): { aType: Archetype; bType: Archetype; note: string } {
  const aType = archetypeFor(a), bType = archetypeFor(b);
  const orient = (f: Fighter) => (f.stats.tdAvg / 5 + f.stats.ctrl / 9) - f.stats.slpm / 6; // + grappler … − striker
  const oa = orient(a), ob = orient(b), clash = Math.abs(oa - ob);
  const grappler = oa > ob ? a : b, striker = oa > ob ? b : a;

  let note: string;
  if (clash > 0.6) {
    // Classic grappler-vs-striker: whoever imposes their world tends to win.
    const gTdThreat = grappler.stats.tdAvg, sTdDef = striker.stats.tdDef;
    note = sTdDef >= 70
      ? `Grappler vs striker — but ${striker.name}'s ${Math.round(sTdDef)}% takedown defense can keep it standing.`
      : `Grappler vs striker — ${grappler.name} can drag ${striker.name} (${Math.round(sTdDef)}% TD defense) into deep water.`;
  } else if (aType.key === bType.key) {
    note = `Two ${aType.label.toLowerCase()}s — the cleaner, more durable version usually wins the exchanges.`;
  } else {
    note = `${aType.label} vs ${bType.label} — a closer stylistic battle; small edges decide it.`;
  }
  return { aType, bType, note };
}
