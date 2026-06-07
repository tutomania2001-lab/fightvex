import type { Metadata } from "next";
import Link from "next/link";
import { allFighters } from "@/lib/data/fighters";
import { nextEvent } from "@/lib/data/events";
import { RelatedNews } from "@/components/live/RelatedNews";
import { FighterCard } from "@/components/fighter/FighterCard";
import { Countdown } from "@/components/fight/Countdown";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your FightVex dashboard — next tracked UFC event, featured fighters and live MMA news.",
  alternates: { canonical: "/dashboard" },
};

export default function DashboardPage() {
  const featured = allFighters().filter((f) => f.champion).slice(0, 3);
  const event = nextEvent();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="steel">Dashboard · Preview</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">Your Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Next event, fighters and real UFC news. Watchlists &amp; tracking activate with accounts.</p>
        </div>
        <Link href="/simulator" className="btn-flare rounded-md px-5 py-2.5 text-sm font-bold uppercase tracking-wide">New Simulation</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel className="reveal bg-cage-fine relative overflow-hidden p-6">
            <div className="spotlight absolute inset-0 opacity-50" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted">Next tracked event</p>
                <h2 className="mt-1 font-display text-xl font-bold uppercase">{event.name}</h2>
                <Link href={`/events/${event.slug}`} className="mt-1 inline-block text-sm text-blood hover:underline">View card →</Link>
              </div>
              <Countdown iso={event.date} />
            </div>
          </Panel>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold uppercase">Featured Champions</h2>
              <Link href="/fighters" className="text-sm text-blood hover:underline">Browse all →</Link>
            </div>
            <div className="reveal-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featured.map((f) => (<div key={f.id} className="reveal"><FighterCard fighter={f} /></div>))}
            </div>
          </div>

          <Panel className="reveal p-6">
            <h2 className="mb-2 font-display text-lg font-bold uppercase">Bankroll Tracking</h2>
            <p className="rounded-lg border border-line bg-panel-2/40 p-4 text-sm text-muted">
              No tracked bets yet — unit, position and closing-line-value tracking activates once accounts launch. We never display fabricated figures. FightVex does not accept or place wagers. 21+.
            </p>
          </Panel>
        </div>

        {/* Alerts rail */}
        <aside className="space-y-4">
          <Panel className="reveal p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold uppercase">UFC News</h2>
              <span className="text-[10px] text-muted">Trusted sources</span>
            </div>
            <RelatedNews limit={4} />
          </Panel>
          <Panel className="reveal p-5">
            <h2 className="mb-2 font-display text-lg font-bold uppercase">Go Full Access</h2>
            <p className="text-sm text-muted">One plan unlocks everything — unlimited simulations, all betting tools and watchlist alerts. £10/mo.</p>
            <Link href="/pricing" className="btn-flare mt-3 inline-block rounded-md px-4 py-2 text-xs font-bold uppercase">See Full Access →</Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
