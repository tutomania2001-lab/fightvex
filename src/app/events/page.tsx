import type { Metadata } from "next";
import Link from "next/link";
import { allEvents } from "@/lib/data/events";
import { Badge } from "@/components/ui/Badge";
import { Countdown } from "@/components/fight/Countdown";

export const metadata: Metadata = {
  title: "Fight Cards",
  description: "Upcoming MMA fight cards with odds, AI confidence scores and matchup breakdowns.",
};

export default function EventsPage() {
  const events = allEvents();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="blood">Fight Cards</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Upcoming Events</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Full cards with odds comparison, AI confidence scores, style-clash breakdowns
          and value signals. Promotion and odds shown are fictional sample data.
        </p>
      </div>

      <div className="space-y-5">
        {events.map((e) => (
          <Link key={e.id} href={`/events/${e.slug}`} className="block">
            <div className="panel panel-hover bg-cage-fine relative overflow-hidden rounded-xl p-6">
              <div className="spotlight absolute inset-0 opacity-40" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="blood">{e.org}</Badge>
                    <Badge variant="steel">{e.matchups.length} bouts</Badge>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold uppercase sm:text-3xl">{e.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(e.date).toUTCString().slice(0, 16)} · {e.venue}, {e.city}, {e.country} · {e.broadcast}
                  </p>
                </div>
                <Countdown iso={e.date} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
