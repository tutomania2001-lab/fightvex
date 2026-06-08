import type { Metadata } from "next";
import Link from "next/link";
import { allEvents } from "@/lib/data/events";
import type { FightEvent } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Countdown } from "@/components/fight/Countdown";
import { CategoryBanner } from "@/components/events/CategoryBanner";
import { EventBanner } from "@/components/events/EventBanner";

export const metadata: Metadata = {
  title: "UFC Fight Cards & Odds — Upcoming Events",
  description:
    "Upcoming UFC fight cards with real market odds, Vex AI win projections, value signals and full tale-of-the-tape matchup breakdowns for every bout.",
  alternates: { canonical: "/events" },
};

// Re-build hourly so the rolling window advances on its own — when this
// weekend's card passes, the next event becomes the top countdown and a new
// event rolls into the list, with no manual step.
export const revalidate = 3600;

// UFC cards are Saturday-night US Eastern; show all dates in ET so a Saturday
// card reads as Saturday (not the UTC next day).
const ET = "America/New_York";
const DAY = 24 * 3600_000;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric" });
const fmtLong = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: ET, weekday: "long", month: "long", day: "numeric" });
const fmtYear = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: ET, year: "numeric" });

// Identify the Monday-start ET calendar week a timestamp falls in. Two events
// share a week iff they map to the same Monday date in ET — this is what lets
// "This Week" always show the current week's card (and nothing once it passes),
// independent of how far out the other fetched events sit.
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const etWeekKey = (t: number) => {
  const idx = WD.indexOf(new Date(t).toLocaleDateString("en-US", { timeZone: ET, weekday: "short" }));
  const sinceMonday = idx === 0 ? 6 : idx - 1;
  const monday = t - sinceMonday * DAY;
  return new Date(monday).toLocaleDateString("en-US", { timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit" });
};

export default function EventsPage() {
  // Server component regenerated hourly (ISR) — "now" is the regeneration time,
  // which is exactly what drives the rolling window.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // Show every upcoming event the fetch captured (the next 3 Saturday cards),
  // soonest first. No extra date window — the fetch already bounds the count,
  // and UFC cards can be 2–3 weeks apart, so a fixed window would drop one.
  const list = allEvents()
    // Keep a card while it's live (most run ~6h from the listed start) but drop it
    // once it's over, so a finished card never lingers as the "This Week" hero —
    // the next event rolls up automatically.
    .filter((e) => new Date(e.date).getTime() > now - 6 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Split into "this (ET calendar) week" and everything later. The current
  // week's card — if there is one — headlines under a "This Week" divider; the
  // rest fall under "Upcoming". On a week with no card, the soonest upcoming
  // event headlines instead under a "Next Event" divider.
  const weekKey = etWeekKey(now);
  const thisWeek = list.filter((e) => etWeekKey(new Date(e.date).getTime()) === weekKey);
  const later = list.filter((e) => etWeekKey(new Date(e.date).getTime()) !== weekKey);

  const heroThisWeek = thisWeek.length > 0;
  const hero = heroThisWeek ? thisWeek[0] : later[0];
  const headRows = heroThisWeek ? thisWeek.slice(1) : []; // extra cards sharing this week (rare double-headers)
  const upcoming = heroThisWeek ? later : later.slice(1);
  const heroSoon = hero ? new Date(hero.date).getTime() - now < 8 * DAY : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="reveal mb-8">
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Events</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Every upcoming UFC event in one place. Real fight cards and market odds from the
          live feed, with Vex AI win projections, value signals and tale of the tape
          breakdowns. More event types coming soon.
        </p>
        <Link href="/predict" className="mt-3 inline-block text-sm font-semibold uppercase tracking-wide text-blood hover:underline">
          See all AI fight predictions →
        </Link>
      </div>

      {/* ── This week's card (or the next one) — headlined with a live countdown ── */}
      {hero && (
        <section className="mb-10">
          <div className="reveal mb-5">
            <CategoryBanner
              title={heroThisWeek ? "This Week" : "Next Event"}
              subtitle={heroThisWeek ? "Live this week" : "Up next on the calendar"}
              count={heroThisWeek ? thisWeek.length : 1}
            />
          </div>
          <Link href={`/events/${hero.slug}`} className="reveal block">
            <div className="panel panel-hover relative min-h-[210px] overflow-hidden rounded-2xl">
              <EventBanner event={hero} />
              {/* Always-dark overlay (fixed black, not the theme bg token) so the
                  light text below stays readable on the dark banner in BOTH modes. */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
              <div className="relative flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.65)" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="blood">{hero.org}</Badge>
                    <Badge variant="steel">{hero.matchups.length > 0 ? `${hero.matchups.length} bouts` : "Card TBA"}</Badge>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold uppercase text-white sm:text-3xl">{hero.name}</h2>
                  <p className="mt-1 text-sm text-white/75">
                    {fmtLong(hero.date)} · {hero.venue}{hero.city ? `, ${hero.city}` : ""}{hero.country ? `, ${hero.country}` : ""} · {hero.broadcast}
                  </p>
                </div>
                <Countdown iso={hero.date} light />
              </div>
            </div>
          </Link>

          {headRows.length > 0 && (
            <div className="reveal-stagger mt-5 space-y-5">
              {headRows.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Upcoming UFC events — date only, no countdown ── */}
      {upcoming.length > 0 && (
        <>
          <div className="reveal mb-5">
            <CategoryBanner title="Upcoming" subtitle="Next UFC events" count={upcoming.length} />
          </div>
          <div className="reveal-stagger space-y-5">
            {upcoming.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </>
      )}

      {!hero && <p className="text-muted">No upcoming events on the calendar right now — check back soon.</p>}
    </div>
  );
}

// Compact event row (banner + date) used for every non-headline card.
function EventRow({ e }: { e: FightEvent }) {
  return (
    <Link href={`/events/${e.slug}`} className="reveal block">
      <div className="panel panel-hover relative overflow-hidden rounded-xl">
        <EventBanner event={e} />
        {/* Always-dark overlay so light text stays readable on the banner in both themes. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
        <div className="relative flex items-center justify-between gap-4 p-6" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.65)" }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="blood">{e.org}</Badge>
              <Badge variant="steel">{e.matchups.length > 0 ? `${e.matchups.length} bouts` : "Card TBA"}</Badge>
            </div>
            <h2 className="mt-2 truncate font-display text-xl font-bold uppercase text-white sm:text-2xl">{e.name}</h2>
            {/* Real venue once we have it; otherwise the date (we always know that). */}
            <p className="mt-1 truncate text-sm text-white/75">
              {e.venue && e.venue !== "TBA"
                ? `${e.venue}${e.city ? `, ${e.city}` : ""}${e.country ? `, ${e.country}` : ""}`
                : fmtLong(e.date)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-xl font-bold uppercase text-white sm:text-2xl">{fmtDate(e.date)}</p>
            <p className="text-xs text-white/60">{fmtYear(e.date)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
