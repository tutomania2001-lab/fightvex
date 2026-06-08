import { ImageResponse } from "next/og";
import { allEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import type { Fighter } from "@/lib/types";

// Dynamic social share card per matchup-prediction page. Inherits the route's
// generateStaticParams, so one branded PNG is built per bout. No external fonts
// (default sans) so it can't fail on a missing asset.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FightVex matchup prediction";

function resolve(slug: string): { a: Fighter; b: Fighter; rounds: number; snA: boolean; snB: boolean } | null {
  for (const e of allEvents()) {
    for (const m of e.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      if (`${a.slug}-vs-${b.slug}` === slug) return { a, b, rounds: m.rounds, snA: !!m.shortNoticeA, snB: !!m.shortNoticeB };
    }
  }
  return null;
}

export default async function Image({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const r = resolve(matchup);

  const title = r ? `${r.a.name}  vs  ${r.b.name}` : "FightVex Prediction";
  let verdict = "AI fight prediction";
  if (r) {
    const sim = simulate(r.a, r.b, { rounds: r.rounds === 5 ? 5 : 3, runs: 800, shortNoticeA: r.snA, shortNoticeB: r.snB });
    const favA = sim.probA >= 0.5;
    const fav = favA ? r.a : r.b;
    const prob = Math.round(Math.max(sim.probA, sim.probB) * 100);
    verdict = `Vex AI favors ${fav.name.split(" ").slice(-1)[0]} - ${prob}%`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0a0b 0%, #14141a 100%)",
          padding: "70px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 16, height: 36, background: "#e11d2a" }} />
          <div style={{ color: "#fff", fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>FIGHTVEX</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#9ca3af", fontSize: 28, textTransform: "uppercase", letterSpacing: 4 }}>Fight Prediction</div>
          <div style={{ color: "#fff", fontSize: 78, fontWeight: 800, lineHeight: 1.05, marginTop: 14 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 26 }}>
            <div style={{ display: "flex", background: "#e11d2a", color: "#fff", fontSize: 36, fontWeight: 700, padding: "12px 26px", borderRadius: 10 }}>
              {verdict}
            </div>
          </div>
        </div>

        <div style={{ color: "#6b7280", fontSize: 24 }}>
          Transparent, backtested AI - real odds - fightvex.com
        </div>
      </div>
    ),
    { ...size },
  );
}
