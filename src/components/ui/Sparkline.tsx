// SVG sparkline for odds / implied-probability movement.
export function Sparkline({
  points,
  width = 120,
  height = 32,
  tone = "edge",
}: {
  points: number[];
  width?: number;
  height?: number;
  tone?: "edge" | "blood" | "amber";
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stroke = tone === "blood" ? "#e10600" : tone === "amber" ? "#ffb000" : "#00e0b8";

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((p - min) / range) * (height - 8);
    return [x, y] as [number, number];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const rising = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={stroke} />
      <title>{rising ? "Trending up" : "Trending down"}</title>
    </svg>
  );
}
