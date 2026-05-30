import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allEvents, getEvent } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { insightsForEvent } from "@/lib/data/research";
import { simulate } from "@/lib/sim";
import { MatchupRow } from "@/components/fight/MatchupRow";
import { Countdown } from "@/components/fight/Countdown";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { lastName, pct } from "@/lib/format";

export function generateStaticParams() {
  return allEvents().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getEvent(slug);
  return { title: e ? e.name : "Event" };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const mainCard = event.matchups.filter((m) => m.isMain);
  const prelims = event.matchups.filter((m) => !m.isMain);
  const insights = insightsForEvent(slug);

  // Deep breakdown for the headliner
  const head = event.matchups[0];
  const ha = getFighterById(head.fighterA)!;
  const hb = getFighterById(head.fighterB)!;
  const headSim = simulate(ha, hb, { rounds: head.rounds, runs: 1000 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="panel bg-cage-fine relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="spotlight absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="blood">{event.org}</Badge>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">{event.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {new Date(event.date).toUTCString().slice(0, 16)} · {event.venue}, {event.city} · {event.broadcast}
            </p>
          </div>
          <Countdown iso={event.date} />
        </div>
      </div>

      {/* Headliner deep breakdown */}
      <Panel className="mt-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="amber">Headliner Breakdown</Badge>
          <span className="text-[10px] text-muted">AI confidence with style-clash analysis</span>
        </div>
        <h2 className="font-display text-2xl font-bold uppercase">{ha.name} vs {hb.name}</h2>
        <p className="mt-1 text-sm text-muted">Style clash: {styleClash(ha, hb)}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-blood/30 bg-blood/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blood">Why {lastName(ha.name)} can win</p>
            <ul className="space-y-1 text-sm text-muted">{ha.strengths.map((s) => (<li key={s}>• {s}</li>))}</ul>
          </div>
          <div className="rounded-lg border border-edge/30 bg-edge/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-edge">Why {lastName(hb.name)} can win</p>
            <ul className="space-y-1 text-sm text-muted">{hb.strengths.map((s) => (<li key={s}>• {s}</li>))}</ul>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel-2/40 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">AI Confidence</p>
            <p className="tnum text-2xl font-bold text-fg">{pct(Math.max(headSim.probA, headSim.probB))}</p>
            <p className="text-[10px] text-muted">favors {headSim.probA > headSim.probB ? lastName(ha.name) : lastName(hb.name)}</p>
          </div>
          <div className="h-10 w-px bg-line" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Volatility</p>
            <p className="text-2xl font-bold text-amber">{headSim.variance}</p>
          </div>
          <div className="h-10 w-px bg-line" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Public sentiment</p>
            <p className="tnum text-2xl font-bold text-fg">{head.publicSentimentA ?? "—"}%</p>
            <p className="text-[10px] text-muted">on {lastName(ha.name)} (permitted source)</p>
          </div>
        </div>
        <div className="mt-4"><Disclaimer /></div>
      </Panel>

      {/* Main card */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <span className="inline-block h-5 w-1 bg-blood" /> Main Card
        </h2>
        <div className="space-y-4">{mainCard.map((m) => (<MatchupRow key={m.id} matchup={m} />))}</div>
      </section>

      {/* Prelims */}
      {prelims.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold uppercase">
            <span className="inline-block h-5 w-1 bg-steel" /> Preliminary Card
          </h2>
          <div className="space-y-4">{prelims.map((m) => (<MatchupRow key={m.id} matchup={m} />))}</div>
        </section>
      )}

      {/* Event intelligence */}
      {insights.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-bold uppercase">Event Intelligence</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((i) => (
              <div key={i.id} className="panel rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="steel">{i.type}</Badge>
                  <span className="text-[10px] text-muted">{i.recency}</span>
                </div>
                <h3 className="font-display text-base font-bold text-fg">{i.headline}</h3>
                <p className="mt-1 text-sm text-muted">{i.summary}</p>
                <p className="mt-2 text-[10px] text-muted">{i.source} · Confidence: {i.confidence}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function styleClash(a: { stats: { tdAvg: number; slpm: number } }, b: { stats: { tdAvg: number; slpm: number } }): string {
  const aGrappler = a.stats.tdAvg > 2.5;
  const bGrappler = b.stats.tdAvg > 2.5;
  if (aGrappler && !bGrappler) return "grappler vs striker — can the takedowns land?";
  if (!aGrappler && bGrappler) return "striker vs grappler — sprawl-and-brawl or get controlled?";
  if (!aGrappler && !bGrappler) return "striker vs striker — expect fireworks on the feet.";
  return "grappler vs grappler — scrambles and control time decide it.";
}
