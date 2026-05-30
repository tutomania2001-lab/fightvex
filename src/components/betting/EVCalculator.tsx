"use client";

import { useState } from "react";
import { impliedProb, toDecimal, expectedValue, fmtOdds, pct } from "@/lib/format";

export function EVCalculator() {
  const [odds, setOdds] = useState(140);
  const [prob, setProb] = useState(45);
  const [stake, setStake] = useState(100);

  const p = prob / 100;
  const implied = impliedProb(odds);
  const dec = toDecimal(odds);
  const ev = expectedValue(p, odds);
  const evMoney = ev * stake;
  const edge = p - implied;

  return (
    <div className="panel rounded-xl p-6">
      <h2 className="mb-1 font-display text-xl font-bold uppercase">Expected Value Calculator</h2>
      <p className="mb-5 text-sm text-muted">Compare your estimated win probability to the market price. Positive EV ≠ guaranteed profit.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="American odds">
          <input type="number" value={odds} onChange={(e) => setOdds(Number(e.target.value))} className="input" />
        </Field>
        <Field label="Your win probability (%)">
          <input type="number" value={prob} min={1} max={99} onChange={(e) => setProb(Number(e.target.value))} className="input" />
        </Field>
        <Field label="Stake (units)">
          <input type="number" value={stake} onChange={(e) => setStake(Number(e.target.value))} className="input" />
        </Field>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Decimal" v={dec.toFixed(2)} />
        <Stat label="Implied prob" v={pct(implied)} />
        <Stat label="Your edge" v={`${edge >= 0 ? "+" : ""}${pct(edge)}`} tone={edge >= 0 ? "edge" : "blood"} />
        <Stat label="EV / unit" v={`${ev >= 0 ? "+" : ""}${ev.toFixed(3)}`} tone={ev >= 0 ? "edge" : "blood"} />
      </div>

      <div className={`mt-4 rounded-lg border p-4 ${ev >= 0 ? "border-edge/30 bg-edge/5" : "border-blood/30 bg-blood/5"}`}>
        <p className="text-sm text-muted">
          At <span className="tnum text-fg">{fmtOdds(odds)}</span> with a{" "}
          <span className="tnum text-fg">{prob}%</span> estimated chance, a{" "}
          <span className="tnum text-fg">{stake}</span>-unit bet has an expected value of{" "}
          <span className={`tnum font-bold ${ev >= 0 ? "text-edge" : "text-blood"}`}>{evMoney >= 0 ? "+" : ""}{evMoney.toFixed(1)} units</span>.
        </p>
        <p className="mt-2 text-[11px] text-muted">
          EV is a long-run statistical expectation given your probability estimate — it is not a prediction of this single result and not a guarantee. 21+.
        </p>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid var(--color-line);
          background: var(--color-bg);
          padding: 0.5rem 0.75rem;
          font-family: var(--font-mono);
          color: var(--color-fg);
          outline: none;
        }
        .input:focus { border-color: var(--color-blood); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
function Stat({ label, v, tone }: { label: string; v: string; tone?: "edge" | "blood" }) {
  return (
    <div className="rounded-md border border-line bg-panel-2/50 p-3 text-center">
      <p className={`tnum text-lg font-bold ${tone === "edge" ? "text-edge" : tone === "blood" ? "text-blood" : "text-fg"}`}>{v}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
