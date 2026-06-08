import type { SimResult } from "@/lib/sim";
import type { Fighter } from "@/lib/types";
import { pickRationale } from "@/lib/rationale";

// Plain-English rationale for a pick, generated from the engine's own factor
// edges + real stats (see lib/rationale.ts). Works in server or client trees.
export function PickRationale({ sim, a, b, className = "" }: { sim: SimResult; a: Fighter; b: Fighter; className?: string }) {
  return (
    <div className={`rounded-xl border border-line/60 bg-panel/40 p-4 ${className}`}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-edge">The read</p>
      <p className="text-sm leading-relaxed text-fg/90">{pickRationale(sim, a, b)}</p>
    </div>
  );
}
