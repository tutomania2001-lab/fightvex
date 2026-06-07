import type { Metadata } from "next";
import Link from "next/link";
import { PlanButton } from "@/components/billing/PlanButton";
import type { Plan } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro & Elite UFC Betting Tools",
  description: "FightVex plans: a free tier plus Pro and Elite upgrades for AI UFC fight intelligence, unlimited simulations and advanced betting tools. Cancel anytime. 21+.",
  alternates: { canonical: "/pricing" },
};

const TIERS: { name: string; plan: Plan; price: string; cadence: string; highlight: boolean; cta: string; features: string[] }[] = [
  {
    name: "Free",
    plan: "free",
    price: "£0",
    cadence: "forever",
    highlight: false,
    cta: "Create free account",
    features: ["Fighter profiles (core stats)", "Upcoming fight cards", "Basic odds display", "Preview simulation", "Research feed (delayed)"],
  },
  {
    name: "Pro",
    plan: "pro",
    price: "£20",
    cadence: "/month",
    highlight: true,
    cta: "Get Pro",
    features: ["Everything in Free", "Full 40+ metric profiles", "Unlimited simulations", "Line-movement tracker", "EV & implied-prob tools", "Watchlists & alerts", "Real-time research feed"],
  },
  {
    name: "Elite",
    plan: "elite",
    price: "£40",
    cadence: "/month",
    highlight: false,
    cta: "Go Elite",
    features: ["Everything in Pro", "5,000-run Monte Carlo", "Closing line value tracker", "Market-overreaction detector", "AI bet-slip review", "Priority research + API-lite", "Bankroll management suite"],
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
            <div className="mt-6">
              <PlanButton plan={t.plan} label={t.cta} highlight={t.highlight} />
            </div>
            <ul className="mt-6 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted">
                  <span className="mt-0.5 text-edge">✓</span> {f}
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
