// Custom SVG radar / spider chart (0..100 values). Supports 1 or 2 series.
export interface RadarDatum {
  label: string;
  a: number;
  b?: number;
}

export function Radar({
  data,
  size = 260,
  labelA = "A",
  labelB = "B",
}: {
  data: RadarDatum[];
  size?: number;
  labelA?: string;
  labelB?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 38;
  const n = data.length;

  const pointAt = (i: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (value / 100) * r;
    return [cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad];
  };

  const polygon = (key: "a" | "b") =>
    data
      .map((d, i) => {
        const v = key === "a" ? d.a : d.b ?? 0;
        const [x, y] = pointAt(i, v);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const rings = [25, 50, 75, 100];
  const hasB = data.some((d) => d.b !== undefined);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px]">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={data.map((_, i) => pointAt(i, ring).join(",")).join(" ")}
          fill="none"
          stroke="#24272e"
          strokeWidth={1}
        />
      ))}
      {data.map((d, i) => {
        const [x, y] = pointAt(i, 100);
        const [lx, ly] = pointAt(i, 122);
        return (
          <g key={d.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#1c1f25" strokeWidth={1} />
            <text x={lx} y={ly} fontSize={9} fill="#8a909a" textAnchor="middle" dominantBaseline="middle" className="uppercase">
              {d.label}
            </text>
          </g>
        );
      })}
      {hasB && <polygon points={polygon("b")} fill="rgba(0,224,184,0.16)" stroke="#00e0b8" strokeWidth={1.5} />}
      <polygon points={polygon("a")} fill="rgba(225,6,0,0.18)" stroke="#e10600" strokeWidth={1.5} />
      {hasB && (
        <g>
          <rect x={8} y={size - 16} width={8} height={8} fill="#e10600" />
          <text x={20} y={size - 9} fontSize={9} fill="#8a909a">{labelA}</text>
          <rect x={size - 70} y={size - 16} width={8} height={8} fill="#00e0b8" />
          <text x={size - 58} y={size - 9} fontSize={9} fill="#8a909a">{labelB}</text>
        </g>
      )}
    </svg>
  );
}
