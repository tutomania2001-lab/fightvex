import { ImageResponse } from "next/og";
import { getFighter } from "@/lib/data/fighters";
import { recordString } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FightVex fighter profile";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFighter(slug);

  const name = f ? f.name : "FightVex";
  const sub = f
    ? [f.weightClass, recordString(f.record), f.title ? f.title : f.ranking !== undefined ? `#${f.ranking} Ranked` : ""].filter(Boolean).join("  -  ")
    : "AI UFC fight intelligence";

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
          <div style={{ color: "#fff", fontSize: 90, fontWeight: 800, lineHeight: 1.02 }}>{name}</div>
          <div style={{ color: "#9ca3af", fontSize: 34, marginTop: 22 }}>{sub}</div>
        </div>

        <div style={{ color: "#6b7280", fontSize: 24 }}>Real stats - Vex AI simulator - fightvex.com</div>
      </div>
    ),
    { ...size },
  );
}
