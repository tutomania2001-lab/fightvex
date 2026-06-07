import type { Metadata } from "next";
import { fightersByClass, P4P_DIVISIONS } from "@/lib/data/fighters";
import { DivisionAccordion } from "@/components/fighter/DivisionAccordion";

export const metadata: Metadata = {
  title: "UFC Fighter Stats, Records & Rankings — The Roster",
  description:
    "Real UFC fighter profiles, records, rankings and per-fight stats by division — striking, grappling and finishing metrics for every champion and contender.",
  alternates: { canonical: "/fighters" },
};

// Standard UFC division order; any other ESPN-returned class is appended.
const ORDER = [
  "Flyweight", "Bantamweight", "Featherweight", "Lightweight", "Welterweight",
  "Middleweight", "Light Heavyweight", "Heavyweight",
  "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
];

export default function FightersPage() {
  const byClass = fightersByClass();
  const keys = Object.keys(byClass);
  const weightDivisions = keys
    .map((wc) => ({ wc, count: byClass[wc].length }))
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.wc); const ib = ORDER.indexOf(b.wc);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  // Pound-for-pound ladders sit at the top, above the weight divisions.
  const divisions = [...P4P_DIVISIONS, ...weightDivisions];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="reveal mb-8">
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Fighters</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Real fighters, records and bios from UFC, organized by division. Pick a
          division to open it.
        </p>
      </div>

      <DivisionAccordion divisions={divisions} />
    </div>
  );
}
