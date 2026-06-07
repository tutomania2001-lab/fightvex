import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { listInsights, listWatch, getStats, userRecord } from "@/lib/account-data";
import { personalizedHome, buildChecklist } from "@/lib/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the personalized hub home needs in one call.
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [insights, watchlist, stats] = await Promise.all([
    listInsights(me.id),
    listWatch(me.id),
    getStats(me.id),
  ]);

  const home = personalizedHome(watchlist);
  // Real per-user record: grades saved picks for real bouts against actual
  // results (and persists the grade). Lazy — runs when the user opens the hub.
  // eslint-disable-next-line react-hooks/purity
  const record = await userRecord(me.id, Date.now());
  const checklist = buildChecklist({ insights, watchlist, plan: me.plan, home });

  return NextResponse.json({
    home,
    record,
    checklist,
    stats,
    counts: { insights: insights.length, watchlist: watchlist.length },
  });
}
