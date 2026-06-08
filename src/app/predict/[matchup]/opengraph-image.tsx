import { ImageResponse } from "next/og";
import { allEvents } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";
import { confidenceLabel } from "@/lib/format";
import type { Fighter } from "@/lib/types";

// Dynamic social share card per matchup-prediction page. Inherits the route's
// generateStaticParams, so one branded PNG is built per bout. No external fonts
// (default sans) so it can't fail on a missing asset.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FightVex matchup prediction";

function resolve(slug: string): { a: Fighter; b: Fighter; rounds: number; snA: boolean; snB: boolean; mwA: boolean; mwB: boolean; iA: boolean; iB: boolean; evt: string; wc: string } | null {
  for (const e of allEvents()) {
    for (const m of e.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      if (`${a.slug}-vs-${b.slug}` === slug || `${b.slug}-vs-${a.slug}` === slug)
        return { a, b, rounds: m.rounds, snA: !!m.shortNoticeA, snB: !!m.shortNoticeB, mwA: !!m.missedWeightA, mwB: !!m.missedWeightB, iA: !!m.injuredA, iB: !!m.injuredB, evt: e.name, wc: m.weightClass };
    }
  }
  return null;
}

export default async function Image({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const r = resolve(matchup);

  const last = (n: string) => n.split(" ").slice(-1)[0];
  let favName = "", verdict = "AI fight prediction", meta = "Transparent, backtested AI";
  if (r) {
    const sim = simulate(r.a, r.b, { rounds: r.rounds === 5 ? 5 : 3, runs: 800, shortNoticeA: r.snA, shortNoticeB: r.snB, missedWeightA: r.mwA, missedWeightB: r.mwB, injuredA: r.iA, injuredB: r.iB });
    const favA = sim.probA >= 0.5;
    favName = last((favA ? r.a : r.b).name);
    verdict = confidenceLabel(Math.max(sim.probA, sim.probB));
    meta = `${r.evt}  -  ${r.wc}`;
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0b0d", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 14, height: 38, background: "#e10600" }} />
            <div style={{ color: "#f5f6f8", fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>FIGHTVEX</div>
          </div>
          <div style={{ color: "#2e90ff", fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>AI Fight Prediction</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#9296a0", fontSize: 26, letterSpacing: 2 }}>{meta}</div>
          <div style={{ color: "#f5f6f8", fontSize: 70, fontWeight: 800, lineHeight: 1.05, marginTop: 10 }}>{r ? r.a.name : "FightVex"}</div>
          <div style={{ color: "#5b606a", fontSize: 38, fontWeight: 800, margin: "2px 0" }}>vs</div>
          <div style={{ color: "#f5f6f8", fontSize: 70, fontWeight: 800, lineHeight: 1.05 }}>{r ? r.b.name : "Prediction"}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#9296a0", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>Vex AI pick</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
              {favName ? <div style={{ color: "#f5f6f8", fontSize: 48, fontWeight: 800 }}>{favName}</div> : null}
              <div style={{ color: "#2e90ff", fontSize: 34, fontWeight: 700, textTransform: "uppercase" }}>{verdict}</div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", color: "#5b606a", fontSize: 22 }}>fightvex.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
