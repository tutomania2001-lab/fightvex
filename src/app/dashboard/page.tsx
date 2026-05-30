import type { Metadata } from "next";
import Link from "next/link";
import { allFighters } from "@/lib/data/fighters";
import { nextEvent } from "@/lib/data/events";
import { allInsights } from "@/lib/data/research";
import { FighterCard } from "@/components/fighter/FighterCard";
import { Countdown } from "@/components/fight/Countdown";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const saved = allFighters().slice(0, 3);
  const event = nextEvent();
  const alerts = allInsights().slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="edge">Pro Plan · Demo</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">Welcome back, Analyst</h1>
          <p className="mt-1 text-sm text-muted">Your watchlist, alerts and saved research in one place.</p>
        </div>
        <Link href="/simulator" className="rounded-md bg-blood px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-blood-dim">New Simulation</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel className="bg-cage-fine relative overflow-hidden p-6">
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
              <h2 className="font-display text-lg font-bold uppercase">Saved Fighters</h2>
              <Link href="/fighters" className="text-sm text-blood hover:underline">Add more →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((f) => (<FighterCard key={f.id} fighter={f} />))}
            </div>
          </div>

          <Panel className="p-6">
            <h2 className="mb-4 font-display text-lg font-bold uppercase">Bankroll Snapshot</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "Tracked units", v: "100.0" },
                { l: "Open positions", v: "3" },
                { l: "CLV (30d)", v: "+2.4%" },
              ].map((s) => (
                <div key={s.l} className="rounded-md border border-line bg-panel-2/40 p-3 text-center">
                  <p className="tnum text-xl font-bold text-fg">{s.v}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">Tracking tools only — FightVector does not accept or place wagers. 21+.</p>
          </Panel>
        </div>

        {/* Alerts rail */}
        <aside className="space-y-4">
          <Panel className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold uppercase">Alerts</h2>
              <span className="animate-blink text-[10px] text-edge">● LIVE</span>
            </div>
            <div className="space-y-3">
              {alerts.map((i) => (
                <Link key={i.id} href="/research" className="block rounded-lg border border-line bg-panel-2/40 p-3 hover:border-steel">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="steel">{i.type}</Badge>
                    <span className="text-[10px] text-muted">{i.recency}</span>
                  </div>
                  <p className="text-sm font-medium text-fg">{i.headline}</p>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-2 font-display text-lg font-bold uppercase">Upgrade to Elite</h2>
            <p className="text-sm text-muted">5,000-run Monte Carlo, CLV tracker, market-overreaction detector and bet-slip review.</p>
            <Link href="/pricing" className="mt-3 inline-block rounded-md bg-blood px-4 py-2 text-xs font-bold uppercase text-white hover:bg-blood-dim">See Elite →</Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
