import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Matchup } from "@/lib/types";
import { allEvents, getEvent } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { torsoFor } from "@/lib/data/bodies.generated";
import { simulate } from "@/lib/sim";
import { lastName } from "@/lib/format";
import { FightCard } from "@/components/fight/FightCard";
import { Countdown } from "@/components/fight/Countdown";
import { RelatedNews } from "@/components/live/RelatedNews";
import { Badge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/seo/JsonLd";

// Resolves a bout's fighters + the Vex AI pick (server-side) and renders the
// interactive fight card (collapsed tale-of-the-tape that expands on click).
function Bout({ m }: { m: Matchup }) {
  const a = getFighterById(m.fighterA);
  const b = getFighterById(m.fighterB);
  if (!a || !b) return null;
  const sim = simulate(a, b, { rounds: m.rounds, runs: 400, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB });
  const side: "a" | "b" = sim.probA >= sim.probB ? "a" : "b";
  const pick = { side, lastName: lastName(side === "a" ? a.name : b.name), prob: Math.max(sim.probA, sim.probB) };
  return (
    <div>
      <FightCard a={a} b={b} matchup={m} pick={pick} bodyA={torsoFor(a.slug)} bodyB={torsoFor(b.slug)} />
      <div className="mt-1.5 text-right">
        <Link href={`/predict/${a.slug}-vs-${b.slug}`} className="text-xs font-semibold uppercase tracking-wide text-muted hover:text-blood">Full prediction →</Link>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return allEvents().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) return { title: "Event" };
  const title = `${e.name} — Card, Odds & AI Predictions`;
  const description = `${e.name}: full fight card with real market odds, Vex AI win projections, value signals and tale-of-the-tape breakdowns for every bout. ${[e.venue, e.city, e.country].filter(Boolean).join(", ")}. 21+.`;
  return {
    title,
    description,
    alternates: { canonical: `/events/${e.slug}` },
    openGraph: { type: "website", title, description, url: `/events/${e.slug}` },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const mainCard = event.matchups.filter((m) => m.isMain);
  const prelims = event.matchups.filter((m) => !m.isMain);
  const loc = [event.venue, event.city, event.country].filter(Boolean).join(", ");

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsEvent",
        name: event.name,
        sport: "Mixed Martial Arts",
        startDate: event.date,
        eventStatus: "https://schema.org/EventScheduled",
        url: `https://fightvex.com/events/${event.slug}`,
        ...(loc ? { location: { "@type": "Place", name: event.venue || loc, address: [event.city, event.country].filter(Boolean).join(", ") } } : {}),
        organizer: { "@type": "Organization", name: event.org || "UFC" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Fight Cards", item: "https://fightvex.com/events" },
          { "@type": "ListItem", position: 2, name: event.name, item: `https://fightvex.com/events/${event.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={ld} />
      {/* Header — all real ESPN event data */}
      <div className="reveal panel bg-cage-fine relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="spotlight absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="blood">{event.org}</Badge>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase sm:text-4xl">{event.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {new Date(event.date).toUTCString().slice(0, 16)}{loc ? ` · ${loc}` : ""}{event.broadcast ? ` · ${event.broadcast}` : ""}
            </p>
          </div>
          <Countdown iso={event.date} />
        </div>
      </div>

      {/* Main card — head-to-head for every bout */}
      <section className="reveal mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <span className="inline-block h-5 w-1 bg-blood" /> Main Card
        </h2>
        <div className="mx-auto max-w-4xl space-y-4">
          {mainCard.map((m) => (<Bout key={m.id} m={m} />))}
        </div>
      </section>

      {/* Prelims — head-to-head too */}
      {prelims.length > 0 && (
        <section className="reveal mt-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold uppercase">
            <span className="inline-block h-5 w-1 bg-steel" /> Preliminary Card
          </h2>
          <div className="mx-auto max-w-4xl space-y-4">
            {prelims.map((m) => (<Bout key={m.id} m={m} />))}
          </div>
        </section>
      )}

      {/* Related intelligence — REAL ESPN news (or empty state) */}
      <section className="reveal mt-10">
        <h2 className="mb-4 font-display text-2xl font-bold uppercase">Related Intelligence</h2>
        <RelatedNews limit={6} />
      </section>
    </div>
  );
}
