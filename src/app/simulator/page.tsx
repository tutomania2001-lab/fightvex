import type { Metadata } from "next";
import { Suspense } from "react";
import { allFighters } from "@/lib/data/fighters";
import { WEIGHTS } from "@/lib/sim";
import { Simulator } from "@/components/sim/Simulator";
import { SimulatorLoader } from "@/components/sim/SimulatorLoader";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "AI Fight Simulator",
  description: "Transparent, probabilistic MMA fight simulations with round-by-round breakdowns and explainable factors.",
};

export default function SimulatorPage() {
  const fighters = allFighters();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Badge variant="blood">AI Fight Simulator</Badge>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase sm:text-5xl">Simulate the Matchup</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Pick any two fighters and run a transparent, statistics-driven simulation —
          win probability with confidence ranges, method-of-victory distribution,
          round momentum, and the exact factors that moved the prediction.
        </p>
      </div>

      <Suspense fallback={<Simulator fighters={fighters} />}>
        <SimulatorLoader fighters={fighters} />
      </Suspense>

      {/* Methodology snapshot */}
      <Panel className="mt-10 p-6">
        <h2 className="mb-4 font-display text-xl font-bold uppercase">How the model weights skills</h2>
        <p className="mb-4 text-sm text-muted">
          The composite rating is a transparent weighted blend of nine category
          sub-scores. These priors are published and tuned over time against real results.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(WEIGHTS).sort((a, b) => b[1] - a[1]).map(([k, w]) => (
            <div key={k} className="flex items-center justify-between rounded-md border border-line bg-panel-2/40 px-3 py-2">
              <span className="text-sm text-fg">{k}</span>
              <span className="tnum text-sm font-semibold text-blood">{pct(w)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted">
          Full formulas, calibration approach and missing-data handling are on the{" "}
          <a href="/methodology" className="text-blood underline">methodology page</a>.
        </p>
      </Panel>
    </div>
  );
}
