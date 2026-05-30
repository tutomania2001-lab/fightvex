import { pct } from "@/lib/format";

export function ProbBar({
  probA,
  labelA,
  labelB,
  ciLow,
  ciHigh,
}: {
  probA: number;
  labelA: string;
  labelB: string;
  ciLow?: number;
  ciHigh?: number;
}) {
  const a = Math.round(probA * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-blood">
          {labelA} <span className="tnum">{a}%</span>
        </span>
        <span className="text-edge">
          <span className="tnum">{100 - a}%</span> {labelB}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-edge/30">
        <div
          className="bar-grow h-full rounded-l-full bg-gradient-to-r from-blood to-blood-dim"
          style={{ width: `${a}%` }}
        />
        {ciLow !== undefined && ciHigh !== undefined && (
          <div
            className="absolute top-0 h-full bg-white/15"
            style={{ left: `${ciLow * 100}%`, width: `${(ciHigh - ciLow) * 100}%` }}
            title={`90% range: ${pct(ciLow)}–${pct(ciHigh)}`}
          />
        )}
      </div>
      {ciLow !== undefined && ciHigh !== undefined && (
        <p className="text-center text-[11px] text-muted">
          {labelA} win range <span className="tnum text-fg">{pct(ciLow)} – {pct(ciHigh)}</span> (90% confidence)
        </p>
      )}
    </div>
  );
}
