import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { hasAccess } from "@/lib/entitlements";
import { allEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { noVigProbA } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The exact, bettable read for a matchup — Pro only. Kept OUT of the public
// static page so the numbers (win %, method/round, value lean) aren't in the
// HTML source or indexable; the page fetches this client-side for Pro users.
export async function GET(_req: Request, ctx: { params: Promise<{ matchup: string }> }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!hasAccess(me.plan, "pro")) return NextResponse.json({ error: "Pro required." }, { status: 403 });

  const { matchup } = await ctx.params;
  for (const e of allEvents()) {
    for (const m of e.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      if (`${a.slug}-vs-${b.slug}` !== matchup && `${b.slug}-vs-${a.slug}` !== matchup) continue;

      const sim = simulate(a, b, {
        rounds: m.rounds,
        runs: 2000,
        shortNoticeA: m.shortNoticeA,
        shortNoticeB: m.shortNoticeB,
        missedWeightA: m.missedWeightA,
        missedWeightB: m.missedWeightB,
      });
      const favA = sim.probA >= 0.5;
      const fav = favA ? a : b;
      const method = favA ? sim.methodA : sim.methodB;
      const total = method.ko + method.sub + method.dec || 1;

      const line = m.odds[0];
      const fairA = line ? noVigProbA(line.priceA, line.priceB) : null;
      const edge = fairA != null ? sim.probA - fairA : null;
      const valueSide = edge != null && Math.abs(edge) >= 0.04 ? (edge > 0 ? a.name : b.name) : null;

      return NextResponse.json(
        {
          aName: a.name,
          bName: b.name,
          aWin: Math.round(sim.probA * 100),
          bWin: Math.round(sim.probB * 100),
          favName: fav.name,
          favWin: Math.round(Math.max(sim.probA, sim.probB) * 100),
          method: {
            ko: Math.round((method.ko / total) * 100),
            sub: Math.round((method.sub / total) * 100),
            dec: Math.round((method.dec / total) * 100),
          },
          round: sim.headline.round ?? null,
          variance: sim.variance,
          fairA: fairA != null ? Math.round(fairA * 100) : null,
          valueSide, // the model's edge vs the market — the bettable signal
        },
        { headers: { "cache-control": "no-store" } },
      );
    }
  }
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
