import type { Fighter } from "@/lib/types";
import type { SimResult } from "@/lib/sim";
import { ProbBar } from "../ui/ProbBar";
import { Radar } from "../ui/Radar";
import { Badge } from "../ui/Badge";
import { Disclaimer } from "../ui/Disclaimer";
import { pct, lastName } from "@/lib/format";

function MethodRow({ label, dist, tone }: { label: string; dist: { ko: number; sub: number; dec: number }; tone: "blood" | "edge" }) {
  const color = tone === "blood" ? "text-blood" : "text-edge";
  const items = [
    { k: "KO/TKO", v: dist.ko },
    { k: "SUB", v: dist.sub },
    { k: "DEC", v: dist.dec },
  ];
  return (
    <div>
      <p className={`mb-1 text-sm font-semibold ${color}`}>{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.k} className="rounded-md border border-line bg-panel-2/50 px-2 py-1.5 text-center">
            <p className="tnum text-base font-bold text-fg">{pct(it.v)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{it.k}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimResultView({ a, b, result }: { a: Fighter; b: Fighter; result: SimResult }) {
  const varTone = result.variance === "HIGH" ? "blood" : result.variance === "MEDIUM" ? "amber" : "edge";
  const radarData = ["Striking", "Wrestling", "Grappling", "Submission", "Cardio", "Durability"].map((k) => ({
    label: k.slice(0, 4),
    a: Math.round(result.subscoresA[k]),
    b: Math.round(result.subscoresB[k]),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="steel">Model v1.3</Badge>
        <Badge variant="steel">{result.runs.toLocaleString()} Monte Carlo runs</Badge>
        <Badge variant={varTone as "blood" | "amber" | "edge"}>Variance: {result.variance}</Badge>
        <Badge variant="steel">Data completeness {pct(result.dataCompleteness)}</Badge>
      </div>

      <ProbBar probA={result.probA} labelA={lastName(a.name)} labelB={lastName(b.name)} ciLow={result.ciLow} ciHigh={result.ciHigh} />

      <div className="grid gap-5 md:grid-cols-2">
        <MethodRow label={`${a.name} — method`} dist={result.methodA} tone="blood" />
        <MethodRow label={`${b.name} — method`} dist={result.methodB} tone="edge" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel-2/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Round momentum (+ favors {lastName(a.name)})
          </p>
          <div className="space-y-2">
            {result.roundMomentum.map((m, i) => {
              const left = m < 0;
              const w = Math.min(50, Math.abs(m) * 80);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-muted">R{i + 1}</span>
                  <div className="relative h-3 flex-1 rounded bg-panel">
                    <div className="absolute left-1/2 top-0 h-full w-px bg-line" />
                    <div className={`absolute top-0 h-full ${left ? "bg-edge" : "bg-blood"}`} style={{ width: `${w}%`, left: left ? `${50 - w}%` : "50%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center rounded-lg border border-line bg-panel-2/40 p-4">
          <p className="mb-1 self-start text-xs font-semibold uppercase tracking-wider text-muted">Skill profile</p>
          <Radar data={radarData} labelA={lastName(a.name)} labelB={lastName(b.name)} />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel-2/40 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Top impact factors — what moved this prediction
        </p>
        <ul className="space-y-2">
          {result.factors.map((f) => {
            const toA = f.delta >= 0;
            const w = Math.min(48, Math.abs(f.delta) * 4 + 4);
            return (
              <li key={f.label} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-muted">{f.label}</span>
                <div className="relative h-4 flex-1 rounded bg-panel">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-line" />
                  <div className={`absolute top-0 h-full rounded ${toA ? "bg-blood" : "bg-edge"}`} style={{ width: `${w}%`, left: toA ? "50%" : `${50 - w}%` }} />
                </div>
                <span className={`tnum w-16 shrink-0 text-right text-xs font-semibold ${toA ? "text-blood" : "text-edge"}`}>
                  {toA ? "+" : ""}{f.delta.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-muted">
          Contribution = category weight × (skill gap), mapped to win-probability points. Weights are published on the{" "}
          <a href="/methodology" className="text-blood underline">methodology page</a>.
        </p>
      </div>

      <Disclaimer />
    </div>
  );
}
