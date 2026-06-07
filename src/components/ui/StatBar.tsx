import { classnames } from "@/lib/format";

export function StatBar({
  label,
  value,
  max = 100,
  suffix = "",
  compare,
  tone = "blood",
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  compare?: number;
  tone?: "blood" | "edge" | "amber" | "blue";
}) {
  const pctVal = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClass = tone === "edge" ? "bg-edge" : tone === "amber" ? "bg-amber" : tone === "blue" ? "bg-blue" : "bg-blood";

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tnum font-semibold text-fg">
          {value}
          {suffix}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
        {compare !== undefined && (
          <div
            className="absolute top-0 z-10 h-full w-px bg-steel"
            style={{ left: `${Math.min(100, (compare / max) * 100)}%` }}
            title={`Opponent: ${compare}${suffix}`}
          />
        )}
        <div className={classnames("bar-grow h-full rounded-full", toneClass)} style={{ width: `${pctVal}%` }} />
      </div>
    </div>
  );
}
