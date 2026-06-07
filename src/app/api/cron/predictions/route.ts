import { NextResponse } from "next/server";
import { logUpcoming, gradeDue, trackingEnabled } from "@/lib/predictions";
import { upgradeCommitments } from "@/lib/commit";
import { cronAuth } from "@/lib/cron-auth";
import { sendWatchlistAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled prediction bookkeeping. Triggered by Vercel Cron (sends
// `Authorization: Bearer <CRON_SECRET>`) or an external scheduler with
// `?key=<CRON_SECRET>`.
//   1) logs every upcoming bout's Vex AI pick BEFORE the fight (immutable)
//   2) grades any logged bout whose fight has happened against the real result
// This is what makes the public accuracy record genuine — never back-dated.
export async function GET(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  if (!trackingEnabled) {
    return NextResponse.json({ ok: false, reason: "KV not configured" });
  }
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const logged = await logUpcoming(now);
  const graded = await gradeDue(now);
  const commitments = await upgradeCommitments(); // confirm pending Bitcoin anchors
  const alerts = await sendWatchlistAlerts(now); // Pro+ "your fighter is on this card" emails
  return NextResponse.json({ ok: true, at: new Date(now).toISOString(), logged, graded, commitments, alerts });
}
