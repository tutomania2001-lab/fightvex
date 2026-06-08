import type { Metadata } from "next";
import { nextEvent } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { confidenceLabel, recordString } from "@/lib/format";
import { PickEm, type PickBout } from "@/components/play/PickEm";
import { Badge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Pick'em vs the Vex AI — Free UFC Predictions Game",
  description: "Predict every winner on the next UFC card, then see how your picks stack up against the Vex AI fight model. Free to play — sign up to save your picks. 21+.",
  alternates: { canonical: "/play" },
};

export default function PlayPage() {
  const event = nextEvent();
  const bouts: PickBout[] = [];
  for (const m of event.matchups) {
    const a = getFighterById(m.fighterA);
    const b = getFighterById(m.fighterB);
    if (!a || !b) continue;
    const sim = simulate(a, b, { rounds: m.rounds, runs: 600, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB, missedWeightA: m.missedWeightA, missedWeightB: m.missedWeightB, injuredA: m.injuredA, injuredB: m.injuredB });
    const favA = sim.probA >= 0.5;
    bouts.push({
      id: m.id, wc: m.weightClass,
      a: { name: a.name, slug: a.slug, record: recordString(a.record), img: a.image ?? "" },
      b: { name: b.name, slug: b.slug, record: recordString(b.record), img: b.image ?? "" },
      vexSide: favA ? "A" : "B",
      vexConf: confidenceLabel(Math.max(sim.probA, sim.probB)),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebApplication", name: "FightVex Pick'em", url: "https://fightvex.com/play", applicationCategory: "GameApplication", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }} />
      <div className="reveal">
        <Badge variant="blue">Pick&apos;em</Badge>
        <h1 className="mt-3 font-display text-3xl font-bold uppercase sm:text-4xl">Can you beat the <span className="text-blue">AI</span>?</h1>
        <p className="mt-2 text-muted">Pick every winner on <b className="text-fg">{event.name}</b>, then see how your card stacks up against the Vex AI. Free to play — sign up to save your picks and track your record.</p>
      </div>
      <div className="mt-6">
        <PickEm eventSlug={event.slug} eventName={event.name} bouts={bouts} />
      </div>
    </div>
  );
}
