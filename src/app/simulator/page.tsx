import type { Metadata } from "next";
import { Suspense } from "react";
import { allFighters } from "@/lib/data/fighters";
import { WEIGHTS } from "@/lib/sim";
import { BACKTEST } from "@/lib/data/backtest.generated";
import { Simulator } from "@/components/sim/Simulator";
import { SimulatorLoader } from "@/components/sim/SimulatorLoader";
import { SimTabs } from "@/components/sim/SimTabs";
import { FaqAccordion } from "@/components/sim/FaqAccordion";
import { WeightsInfo } from "@/components/sim/WeightsInfo";
import { JsonLd } from "@/components/seo/JsonLd";

const SIM_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "FightVex AI Fight Simulator",
  url: "https://fightvex.com/simulator",
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Free AI UFC fight simulator — Monte-Carlo win probability, method of victory and round-by-round breakdown for any matchup.",
};

// Truthful FAQ — also emitted as FAQPage structured data (rich-result eligible).
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is the FightVex UFC fight simulator free?",
    a: "There's a free live preview simulation so you can see exactly how Vex AI works. Running your own custom matchups, with any two fighters, your parameters and unlimited runs, is part of a Pro plan, which also unlocks the advanced betting tools.",
  },
  {
    q: "How does the AI predict who will win a fight?",
    a: "Vex AI builds a transparent rating from fight statistics, but it doesn't let one number decide the fight. It runs thousands of style-aware Monte-Carlo simulations — round by round, modelling where the fight happens (standing vs ground), fatigue, accumulated damage and finishing paths — to produce a win probability, method-of-victory split and round-by-round breakdown. Every category weight is published.",
  },
  {
    q: "How accurate are the fight predictions?",
    a: `It's now back-tested against real history, not guessed at. Replaying ${BACKTEST.backtested.toLocaleString()} real UFC bouts (${BACKTEST.yearFrom}–${BACKTEST.yearTo}) — rebuilding each fighter's stats from only their fights before that date, with no hindsight — Vex AI picks the winner about ${(BACKTEST.accuracy * 100).toFixed(0)}% of the time (≈${(BACKTEST.accuracyRecent * 100).toFixed(0)}% on the most recent fights it was never tuned on), with a log-loss of ${BACKTEST.logLoss.toFixed(2)} versus 0.69 for a coin flip, and well-calibrated probabilities. Predictions are still probabilistic estimates, not guarantees: MMA is high-variance, so every result ships with a confidence range and capped probabilities. A research and entertainment tool, not betting advice.`,
  },
  {
    q: "What data does FightVex use?",
    a: "Real data from trusted public sources: fighter identities, records, rankings and event cards. Per-fight statistics are real where available, and otherwise transparently estimated from a fighter's real record (and flagged as estimates). The Vex AI simulation is the only modelled prediction — nothing is invented or presented as real when it isn't.",
  },
  {
    q: "Can I use FightVex to bet on UFC fights?",
    a: "FightVex is informational analytics, not betting advice, and we do not accept wagers. Use the odds, value signals and EV/CLV tools to inform your own decisions. 21+.",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export const metadata: Metadata = {
  title: "Free AI UFC Fight Simulator — Predict Any UFC Matchup",
  description:
    "Simulate any UFC matchup free. Vex AI runs thousands of Monte-Carlo fights for win probability, method of victory, round-by-round breakdown and skill profiles — transparent and explainable. 21+.",
  alternates: { canonical: "/simulator" },
};

export default function SimulatorPage() {
  const fighters = allFighters();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={SIM_LD} />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase sm:text-4xl">Simulate the Matchup</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Tap either fighter to swap in any of the roster. Every panel — win probability,
            method-of-victory, round breakdown and skill profile — is a transparent Vex AI
            output computed from real, aggregated fight data.
          </p>
        </div>
        <WeightsInfo weights={Object.entries(WEIGHTS).sort((a, b) => b[1] - a[1])} />
      </div>

      <SimTabs>
        <Suspense fallback={<Simulator fighters={fighters} />}>
          <SimulatorLoader fighters={fighters} />
        </Suspense>
      </SimTabs>

      <JsonLd data={FAQ_LD} />
      <section className="reveal mx-auto mt-14 max-w-3xl">
        <h2 className="font-display text-2xl font-bold uppercase">Frequently asked questions</h2>
        <FaqAccordion items={FAQ} />
      </section>
    </div>
  );
}
