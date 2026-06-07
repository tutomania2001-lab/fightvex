import type { Metadata } from "next";
import Link from "next/link";
import { PlanButton } from "@/components/billing/PlanButton";
import type { Plan } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro & Elite UFC Betting Tools",
  description: "FightVex plans: a free tier plus Pro and Elite upgrades for AI UFC fight intelligence, unlimited simulations and advanced betting tools. Cancel anytime. 21+.",
  alternates: { canonical: "/pricing" },
};

type Feature = { label: string; desc?: string };
const TIERS: { name: string; plan: Plan; price: string; cadence: string; highlight: boolean; cta: string; tagline: string; features: Feature[] }[] = [
  {
    name: "Free",
    plan: "free",
    price: "£0",
    cadence: "forever",
    highlight: false,
    cta: "Create free account",
    tagline: "Browse fighters, cards and odds, and try the simulator.",
    features: [
      { label: "Fighter profiles", desc: "Core stats, record and ranking for every fighter." },
      { label: "Upcoming fight cards", desc: "Full UFC cards with dates, weight classes and the Vex AI pick." },
      { label: "Real odds", desc: "Live moneyline for every bout on the card." },
      { label: "Simulator preview", desc: "Watch one sample matchup simulate — the controls are locked." },
      { label: "Research feed", desc: "Aggregated UFC news, on a short delay." },
    ],
  },
  {
    name: "Pro",
    plan: "pro",
    price: "£20",
    cadence: "/month",
    highlight: true,
    cta: "Get Pro",
    tagline: "Run the model yourself and find value in the odds.",
    features: [
      { label: "Everything in Free" },
      { label: "Full fighter profiles", desc: "All 40+ metrics per fighter, not just the core stats." },
      { label: "Unlimited simulations", desc: "Run any matchup, change rounds or short-notice, and re-run freely." },
      { label: "Line-movement tracker", desc: "See how each fight's odds shifted from open to now." },
      { label: "EV & no-vig calculators", desc: "Turn any odds into a true win % and expected value." },
      { label: "Watchlist + email alerts", desc: "Follow fighters and get emailed when they're booked on a card." },
      { label: "Real-time research feed", desc: "The full news feed, no delay." },
    ],
  },
  {
    name: "Elite",
    plan: "elite",
    price: "£40",
    cadence: "/month",
    highlight: false,
    cta: "Go Elite",
    tagline: "Deeper sims and tools to track and size your bets.",
    features: [
      { label: "Everything in Pro" },
      { label: "5,000-run simulations", desc: "Deeper Monte-Carlo for tighter, steadier probabilities." },
      { label: "Closing-line-value tracker", desc: "Log your bets and measure each against the closing line." },
      { label: "Market-overreaction flags", desc: "Bouts where the line moved more than the matchup warrants." },
      { label: "AI bet-slip review", desc: "The model's read on each leg of a slip and its combined edge." },
      { label: "Bankroll tools", desc: "Kelly unit-sizing, staking plans and profit/loss tracking." },
      { label: "Priority + API access", desc: "Earliest research and a lightweight data API." },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="reveal mb-10 text-center">
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Pick your plan</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Transparent analytics at every tier. We monetize depth and tooling — never
          guaranteed picks. Cancel anytime.
        </p>
      </div>

      <div className="reveal-stagger grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => {
          // Plan identity colours: Pro = blue, Elite = red, Free = neutral.
          const accent =
            t.plan === "pro"
              ? { ring: "border-blue/70 glow-blue", title: "text-blue", badge: "bg-blue" }
              : t.plan === "elite"
                ? { ring: "border-blood/70 glow-blood", title: "text-blood-dim", badge: "bg-blood" }
                : { ring: "", title: "text-fg", badge: "bg-fg/80" };
          return (
          <div key={t.name} className={`reveal panel relative rounded-2xl p-7 ${accent.ring}`}>
            {t.highlight && (
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${accent.badge} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white`}>Most popular</span>
            )}
            <h2 className={`font-display text-2xl font-bold uppercase ${accent.title}`}>{t.name}</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold text-fg">{t.price}</span>
              <span className="text-sm text-muted">{t.cadence}</span>
            </div>
            <p className="mt-3 min-h-[2.5rem] text-sm text-muted">{t.tagline}</p>
            <div className="mt-5">
              <PlanButton plan={t.plan} label={t.cta} highlight={t.highlight} />
            </div>
            <ul className="mt-6 space-y-3">
              {t.features.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-sm leading-snug">
                  <span className="mt-0.5 shrink-0 text-edge">✓</span>
                  <span>
                    <span className="font-semibold text-fg">{f.label}</span>
                    {f.desc && <span className="text-muted"> — {f.desc}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>

      {/* B2B / analyst */}
      <div className="reveal panel mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl p-7 sm:flex-row">
        <div>
          <h3 className="font-display text-xl font-bold uppercase">Analyst & B2B</h3>
          <p className="mt-1 text-sm text-muted">Data licensing, embeddable widgets, and an analyst/admin dashboard for media and sportsbook partners.</p>
        </div>
        <Link href="/login" className="rounded-md border border-line px-6 py-3 text-sm font-bold uppercase tracking-wide hover:border-steel">Contact sales</Link>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[11px] leading-relaxed text-muted">
        21+. FightVector provides informational analytics and does not accept wagers or
        guarantee outcomes. Affiliate sportsbook links, where shown, are clearly
        disclosed and region-aware. Please gamble responsibly.
      </p>
    </div>
  );
}
