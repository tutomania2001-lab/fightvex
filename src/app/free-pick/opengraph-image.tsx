import { ImageResponse } from "next/og";
import { nextEvent } from "@/lib/data/events";
import { getFighterById } from "@/lib/data/fighters";
import { simulate } from "@/lib/sim";

// Branded share card for the free pick of the week. ASCII-only text + default
// sans so it can never fail on a missing font/glyph.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FightVex free pick of the week";

export default function Image() {
  const event = nextEvent();
  const m = event.matchups.find((mm, i) => i > 0 && getFighterById(mm.fighterA) && getFighterById(mm.fighterB)) ?? event.matchups[0];
  const a = getFighterById(m.fighterA)!;
  const b = getFighterById(m.fighterB)!;
  const sim = simulate(a, b, { rounds: m.rounds, runs: 800, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB, missedWeightA: m.missedWeightA, missedWeightB: m.missedWeightB, injuredA: m.injuredA, injuredB: m.injuredB });
  const favA = sim.probA >= 0.5;
  const fav = favA ? a : b;
  const favPct = Math.round((favA ? sim.probA : 1 - sim.probA) * 100);
  const method = (favA ? sim.methodA : sim.methodB);
  const mlabel = method.dec >= method.ko && method.dec >= method.sub ? "by decision" : method.ko >= method.sub ? "by KO/TKO" : "by submission";
  const last = (n: string) => n.split(" ").slice(-1)[0];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0b0d", padding: "64px 72px", fontFamily: "sans-serif" }}>
        {/* top brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 14, height: 38, background: "#e10600" }} />
            <div style={{ color: "#f5f6f8", fontSize: 34, fontWeight: 800, letterSpacing: 3 }}>FIGHTVEX</div>
          </div>
          <div style={{ color: "#3fdd80", fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>Free Pick of the Week</div>
        </div>

        {/* matchup */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#9296a0", fontSize: 26, letterSpacing: 2 }}>{event.name}  -  {m.weightClass}</div>
          <div style={{ color: "#f5f6f8", fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 10 }}>{a.name}</div>
          <div style={{ color: "#5b606a", fontSize: 40, fontWeight: 800, lineHeight: 1.0, margin: "2px 0" }}>vs</div>
          <div style={{ color: "#f5f6f8", fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{b.name}</div>
        </div>

        {/* verdict */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#9296a0", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>Vex AI pick</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6 }}>
              <div style={{ color: "#f5f6f8", fontSize: 48, fontWeight: 800 }}>{last(fav.name)}</div>
              <div style={{ color: "#2e90ff", fontSize: 56, fontWeight: 800 }}>{favPct}%</div>
              <div style={{ color: "#9296a0", fontSize: 30 }}>{mlabel}</div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", color: "#5b606a", fontSize: 22 }}>fightvex.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
