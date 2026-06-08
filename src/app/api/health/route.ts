import { NextResponse } from "next/server";
import { allEvents, upcomingEvents } from "@/lib/data/events";
import { allFighters } from "@/lib/data/fighters";
import { ODDS_CAPTURED, ODDS_SOURCE } from "@/lib/data/odds.generated";
import { BACKTEST } from "@/lib/data/backtest.generated";

// Lightweight health + data-freshness probe. No KV/auth imports, so it stays
// cheap and can't be tripped by a downstream outage. Surfaces the signals that
// silently go stale (odds capture age, whether any upcoming card exists) plus a
// warnings[] array so an uptime check can alert on degradation, not just 5xx.
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function GET() {
  const now = Date.now();
  const events = allEvents();
  const up = upcomingEvents();
  const next = up[0] ?? null;

  const oddsAgeDays = Math.round((now - new Date(ODDS_CAPTURED).getTime()) / DAY);
  const nextDaysAway = next ? Math.round((new Date(next.date).getTime() - now) / DAY) : null;

  const warnings: string[] = [];
  if (!next) warnings.push("no_upcoming_events");
  if (Number.isFinite(oddsAgeDays) && oddsAgeDays > 10) warnings.push(`odds_stale_${oddsAgeDays}d`);
  if (events.length === 0) warnings.push("no_events_loaded");
  if (allFighters().length === 0) warnings.push("no_fighters_loaded");

  return NextResponse.json(
    {
      ok: warnings.length === 0,
      now: new Date(now).toISOString(),
      data: {
        events: events.length,
        upcomingEvents: up.length,
        fighters: allFighters().length,
        nextEvent: next ? { name: next.name, slug: next.slug, date: next.date, daysAway: nextDaysAway } : null,
        odds: { capturedAt: ODDS_CAPTURED, ageDays: oddsAgeDays, source: ODDS_SOURCE },
      },
      backtest: { accuracy: BACKTEST.accuracy, bouts: BACKTEST.backtested, years: `${BACKTEST.yearFrom}-${BACKTEST.yearTo}` },
      warnings,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
