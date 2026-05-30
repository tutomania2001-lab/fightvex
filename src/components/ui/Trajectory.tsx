import type { FormEntry } from "@/lib/types";

// Career trajectory: performance rating over recent fights, dots colored by result.
export function Trajectory({ form }: { form: FormEntry[] }) {
  const data = [...form].reverse(); // oldest → newest
  const width = 520;
  const height = 160;
  const padX = 28;
  const padY = 20;
  const n = data.length;
  if (n < 2) return null;

  const xAt = (i: number) => padX + (i / (n - 1)) * (width - padX * 2);
  const yAt = (v: number) => height - padY - (v / 100) * (height - padY * 2);

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(d.rating).toFixed(1)}`).join(" ");
  const resultColor = (rr: string) => (rr === "W" ? "#00e0b8" : rr === "L" ? "#e10600" : "#ffb000");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[25, 50, 75].map((g) => (
        <line key={g} x1={padX} x2={width - padX} y1={yAt(g)} y2={yAt(g)} stroke="#1c1f25" strokeWidth={1} />
      ))}
      <path d={`${path} L${xAt(n - 1)} ${height - padY} L${xAt(0)} ${height - padY} Z`} fill="url(#trajGrad)" opacity={0.5} />
      <defs>
        <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e10600" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e10600" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="#e10600" strokeWidth={2} />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(d.rating)} r={4} fill={resultColor(d.result)} stroke="#0a0b0d" strokeWidth={1.5} />
          <text x={xAt(i)} y={height - 6} fontSize={8} fill="#565b63" textAnchor="middle">{d.date.slice(2)}</text>
        </g>
      ))}
    </svg>
  );
}
