import type { Metadata } from "next";
import Link from "next/link";
import { allEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { EVCalculator } from "@/components/betting/EVCalculator";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Sparkline } from "@/components/ui/Sparkline";
import { noVigProbA, bestPrice, fmtOdds, pct, lastName, impliedProb } from "@/lib/format";

export const metadata: Metadata = {
  title: "Betting Intelligence",
  description: "Odds comparison, line movement, EV calculator and value signals for MMA. Informational only — not betting advice.",
};

const FEATURES = [
  "Odds comparison", "Line-movement tracker", "Implied probability", "Expected value (EV)",
  "Parlay builder", "Prop explorer", "Underdog watchlist", "Favorite risk rating",
  "Market-overreaction detector", "AI bet-slip review", "Closing line value (CLV)", "Bankroll tools",
];

export default function BettingPage() {
  // Build an odds board across all matchups with model vs market edges
  const rows = allEvents().flatMap((e) =>
    e.matchups.map((m) => {
      const a = getFighterById(m.fighterA)!;
      const b = getFighterById(m.fighterB)!;
      const sim = simulate(a, b, { rounds: m.rounds, runs: 500 });
      const bestA = bestPrice(m.odds.map((o) => o.priceA));
      const bestB = bestPrice(m.odds.map((o) => o.priceB));
      const fairA = noVigProbA(bestA, bestB);
      return { e, m, a, b, sim, bestA, bestB, fairA, edge: sim.probA - fairA };
    })
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="blood">Betting Intelligence</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">The Edge Desk</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Compare prices, track line movement, and see where our model disagrees with
          the market. Everything here is informational analytics — not betting advice,
          and never a guarantee of profit.
        </p>
      </div>

      {/* Feature chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {FEATURES.map((f) => (<Badge key={f} variant="steel">{f}</Badge>))}
      </div>

      {/* Odds board */}
      <Panel className="mb-8 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-display text-xl font-bold uppercase">Odds Board & Value Signals</h2>
          <span className="text-[11px] text-muted">Best price across books · model vs no-vig market</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="p-3 pl-5">Matchup</th><th className="p-3">Best A</th><th className="p-3">Best B</th>
                <th className="p-3">Market (A)</th><th className="p-3">Model (A)</th><th className="p-3">Line</th><th className="p-3 pr-5">Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, m, a, b, sim, bestA, bestB, fairA, edge }) => (
                <tr key={m.id} className="border-b border-line-soft last:border-0 hover:bg-panel-2/40">
                  <td className="p-3 pl-5">
                    <Link href={`/events/${e.slug}#${m.id}`} className="font-semibold text-fg hover:text-blood">{lastName(a.name)} vs {lastName(b.name)}</Link>
                    <p className="text-[10px] text-muted">{m.weightClass} · {m.rounds}rd</p>
                  </td>
                  <td className="tnum p-3 text-blood">{fmtOdds(bestA)}</td>
                  <td className="tnum p-3 text-edge">{fmtOdds(bestB)}</td>
                  <td className="tnum p-3 text-muted">{pct(fairA)}</td>
                  <td className="tnum p-3 text-fg">{pct(sim.probA)}</td>
                  <td className="p-3"><Sparkline points={m.lineHistory.map((p) => p.impliedA)} width={56} height={18} tone="amber" /></td>
                  <td className="p-3 pr-5">
                    {Math.abs(edge) >= 0.04 ? (
                      <span className={edge > 0 ? "text-edge" : "text-amber"}>
                        {edge > 0 ? lastName(a.name) : lastName(b.name)} +{pct(Math.abs(edge))}
                      </span>
                    ) : (<span className="text-muted">—</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4"><Disclaimer>Value signals flag where our model probability diverges from the no-vig market price. They are informational research signals, not betting advice or guaranteed winners. Markets are efficient; disagreement can mean the model is wrong. 21+.</Disclaimer></div>
      </Panel>

      {/* EV calculator */}
      <EVCalculator />

      {/* Tools grid */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { t: "Line Movement Tracker", d: "Time-series of implied probability across books to spot steam moves and reverse line movement." },
          { t: "Closing Line Value", d: "Log your entry price vs the closing line — the single best long-run indicator of betting skill." },
          { t: "Bankroll Management", d: "Unit sizing, flat vs fractional-Kelly guidance, and loss-limit guardrails baked in." },
        ].map((c) => (
          <Panel key={c.t} className="p-5">
            <div className="mb-2 inline-block h-1 w-8 bg-blood" />
            <h3 className="font-display text-lg font-bold uppercase">{c.t}</h3>
            <p className="mt-1 text-sm text-muted">{c.d}</p>
            <p className="mt-3 text-[11px] uppercase tracking-wider text-edge">Pro / Elite feature</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
