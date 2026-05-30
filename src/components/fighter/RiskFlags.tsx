import type { RiskFlag } from "@/lib/types";

const sev = {
  low: "border-amber/30 text-amber",
  med: "border-amber/50 text-amber",
  high: "border-blood/50 text-blood",
};

export function RiskFlags({ flags }: { flags: RiskFlag[] }) {
  if (!flags.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-edge">
        <span>✓</span> No active risk flags from compliant sources.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => (
        <li key={i} className={`rounded-lg border bg-panel-2/50 px-3 py-2 ${sev[f.severity]}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">⚠ {f.label}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted">{f.severity} risk</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Source: {f.source} · Confidence: {f.confidence} · Updated {f.updated}
          </p>
        </li>
      ))}
    </ul>
  );
}
