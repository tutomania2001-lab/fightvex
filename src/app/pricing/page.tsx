import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Pricing",
  description: "FightVector plans — Free, Pro and Elite Bettor tiers for AI MMA fight intelligence.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    highlight: false,
    cta: "Start free",
    features: ["Fighter profiles (core stats)", "Upcoming fight cards", "Basic odds display", "3 simulations / month", "Research feed (delayed)"],
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "/month",
    highlight: true,
    cta: "Get Pro",
    features: ["Everything in Free", "Full 40+ metric profiles", "Unlimited simulations", "Line-movement tracker", "EV & implied-prob tools", "Watchlists & alerts", "Real-time research feed"],
  },
  {
    name: "Elite Bettor",
    price: "$49",
    cadence: "/month",
    highlight: false,
    cta: "Go Elite",
    features: ["Everything in Pro", "5,000-run Monte Carlo", "Closing line value tracker", "Market-overreaction detector", "AI bet-slip review", "Priority research + API-lite", "Bankroll management suite"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <Badge variant="blood">Pricing</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Pick your edge</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Transparent analytics at every tier. We monetize depth and tooling — never
          guaranteed picks. Cancel anytime.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.name} className={`panel relative rounded-2xl p-7 ${t.highlight ? "border-blood glow-blood" : ""}`}>
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blood px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Most popular</span>
            )}
            <h2 className="font-display text-2xl font-bold uppercase">{t.name}</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold text-fg">{t.price}</span>
              <span className="text-sm text-muted">{t.cadence}</span>
            </div>
            <Link href="/login" className={`mt-6 block rounded-md py-3 text-center text-sm font-bold uppercase tracking-wide ${t.highlight ? "bg-blood text-white hover:bg-blood-dim" : "border border-line text-fg hover:border-steel"}`}>
              {t.cta}
            </Link>
            <ul className="mt-6 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted">
                  <span className="mt-0.5 text-edge">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* B2B / analyst */}
      <div className="panel mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl p-7 sm:flex-row">
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
