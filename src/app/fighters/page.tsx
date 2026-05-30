import type { Metadata } from "next";
import { fightersByClass } from "@/lib/data/fighters";
import { FighterCard } from "@/components/fighter/FighterCard";
import { SectionHeading } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Fighter Database",
  description: "Searchable MMA fighter directory with 40+ analytics metrics per fighter.",
};

export default function FightersPage() {
  const byClass = fightersByClass();
  const classes = Object.keys(byClass);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="blood">Fighter Database</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">The Roster</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Deep analytics on every fighter — striking, grappling, cardio, durability,
          opponent quality and AI style summaries. All data shown here is fictional
          sample data for demonstration.
        </p>
      </div>

      {classes.map((c) => (
        <section key={c} className="mb-12">
          <SectionHeading kicker={`${byClass[c].length} fighters`} title={c} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {byClass[c].map((f) => (<FighterCard key={f.id} fighter={f} />))}
          </div>
        </section>
      ))}
    </div>
  );
}
