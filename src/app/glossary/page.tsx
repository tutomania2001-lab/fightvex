import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "UFC Betting & AI Glossary — Odds, EV, CLV, No-Vig Explained",
  description: "Plain-English definitions of the UFC betting and AI-prediction terms used on FightVex: moneyline, no-vig probability, expected value (EV), closing-line value (CLV), Kelly, Monte Carlo, calibration and more. 21+.",
  alternates: { canonical: "/glossary" },
};

const TERMS: { t: string; d: string }[] = [
  { t: "Moneyline", d: "A bet on who wins the fight. Negative odds (e.g. -150) mark the favourite; positive odds (e.g. +130) mark the underdog and a bigger payout." },
  { t: "Underdog", d: "The fighter the market expects to lose, priced at plus odds. FightVex's Upset Radar surfaces underdogs the Vex AI actually favours." },
  { t: "Implied probability", d: "The win chance baked into a price. -200 implies about 67%; +150 implies about 40%. It's how you turn odds into a probability." },
  { t: "No-vig (fair) probability", d: "Implied probability with the bookmaker's margin (the 'vig') stripped out, so both sides add to 100%. FightVex compares the Vex AI's number to this fair line." },
  { t: "The vig (juice)", d: "The bookmaker's built-in margin — why both sides of a fight imply more than 100% combined. It's the house edge casual bettors quietly pay." },
  { t: "Value / edge", d: "When your estimated probability is higher than the market's implied probability for the same outcome. Positive edge is the whole point of betting profitably." },
  { t: "Expected value (EV)", d: "The average result of a bet if it were repeated many times, given your probability and the odds. Positive EV means a mathematically profitable bet over the long run." },
  { t: "Closing-line value (CLV)", d: "Whether you bet at a better price than where the market closed. Consistently beating the close is the strongest evidence of a real edge — FightVex tracks the model's CLV." },
  { t: "Kelly criterion", d: "A bankroll formula for how much to stake based on your edge and the odds, balancing growth against risk of ruin. FightVex includes a Kelly calculator." },
  { t: "Monte Carlo simulation", d: "Playing a fight out thousands of times with realistic randomness, then counting the outcomes. FightVex runs each bout 50,000 times to produce its win %, method and round." },
  { t: "Calibration", d: "How well stated probabilities match reality — when a model says 65%, it should win about 65% of the time. FightVex's predictions are calibrated against thousands of real results." },
  { t: "Method of victory", d: "How a fight ends: KO/TKO, submission or decision. The Vex AI estimates the probability of each, not just the winner." },
  { t: "Strength of schedule (SOS)", d: "The quality of opponents a fighter has faced. Beating elite competition counts for more than beating journeymen, and the model accounts for it." },
  { t: "Short notice", d: "Taking a fight with little time to prepare or cut weight — a real disadvantage the model debuffs when it applies." },
  { t: "Missed weight", d: "Failing to make the contracted weight at the official weigh-in, usually meaning a hard, draining cut. FightVex factors it into fight-week adjustments." },
  { t: "Backtest", d: "Re-running the model over historical fights — using only data available before each bout — to measure real accuracy without hindsight (FightVex: ~64.6% over 10,000+ bouts)." },
];

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        name: "FightVex UFC Betting & AI Glossary",
        url: "https://fightvex.com/glossary",
        hasDefinedTerm: TERMS.map((x) => ({ "@type": "DefinedTerm", name: x.t, description: x.d })),
      }} />
      <div className="reveal">
        <h1 className="font-display text-3xl font-bold uppercase sm:text-4xl">UFC betting &amp; AI <span className="text-blue">glossary</span></h1>
        <p className="mt-2 text-muted">Every term FightVex uses, in plain English — from moneylines and no-vig probability to EV, CLV and Monte Carlo.</p>
      </div>
      <dl className="reveal-stagger mt-8 space-y-3">
        {TERMS.map((x) => (
          <div key={x.t} className="reveal panel rounded-xl p-5">
            <dt className="font-display text-base font-bold uppercase tracking-wide text-fg">{x.t}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted">{x.d}</dd>
          </div>
        ))}
      </dl>
      <div className="reveal mt-8 text-center text-sm text-muted">
        Put it to work on the <Link href="/betting" className="text-blood hover:underline">Edge Desk</Link>, the <Link href="/upsets" className="text-blood hover:underline">Upset Radar</Link>, or with a <Link href="/simulator" className="text-blood hover:underline">simulation</Link>. 21+. Not betting advice.
      </div>
    </div>
  );
}
