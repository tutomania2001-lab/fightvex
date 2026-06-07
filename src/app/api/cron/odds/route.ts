import { NextResponse } from "next/server";
import { allEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import {
  fetchTheOddsApi,
  consensusForBouts,
  appendSnapshot,
  kvEnabled,
  oddsApiEnabled,
} from "@/lib/odds-live";
import { cronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Scheduled odds snapshot. Triggered by Vercel Cron (sends
// `Authorization: Bearer <CRON_SECRET>`) or an external scheduler with
// `?key=<CRON_SECRET>`. Appends one real moneyline snapshot per bout to KV.
export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!oddsApiEnabled || !kvEnabled) {
    return NextResponse.json({
      ok: false,
      reason: "not configured",
      need: { THE_ODDS_API_KEY: oddsApiEnabled, KV: kvEnabled },
    });
  }

  // Build the bout list (id + fighter names) from the current card(s).
  const bouts = allEvents().flatMap((e) =>
    e.matchups.flatMap((m) => {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      return a && b ? [{ id: m.id, aName: a.name, bName: b.name }] : [];
    })
  );

  let events;
  try {
    events = await fetchTheOddsApi();
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }

  const consensus = consensusForBouts(events, bouts);
  const t = new Date().toISOString();
  let written = 0;
  for (const [id, line] of Object.entries(consensus)) {
    if (await appendSnapshot(id, { t, a: line.oddsA, b: line.oddsB })) written++;
  }

  return NextResponse.json({ ok: true, t, matched: Object.keys(consensus).length, written, bouts: bouts.length });
}
