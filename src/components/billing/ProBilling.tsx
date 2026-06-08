"use client";

import { useState } from "react";
import { PlanButton } from "./PlanButton";

// Pro pricing block with a monthly/annual toggle. Same plan, two billing
// intervals — annual is 20% off (£96/yr vs £120 at £10/mo). Only rendered when
// the annual price is configured (server passes annualEnabled).
export function ProBilling({ label, highlight, tagline }: { label: string; highlight?: boolean; tagline: string }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const annual = interval === "year";
  const seg = "rounded px-3 py-1 font-semibold uppercase tracking-wide transition-colors";

  return (
    <>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-5xl font-bold text-fg">{annual ? "£70" : "£10"}</span>
        <span className="text-sm text-muted">{annual ? "/year" : "/month"}</span>
      </div>
      <div className="mt-3 inline-flex rounded-md border border-line p-0.5 text-[11px]">
        <button onClick={() => setInterval("month")} className={`${seg} ${!annual ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>Monthly</button>
        <button onClick={() => setInterval("year")} className={`${seg} ${annual ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>
          Annual <span className={annual ? "text-bg" : "text-edge"}>−40%</span>
        </button>
      </div>
      <p className="mt-3 min-h-[2.5rem] text-sm text-muted">
        {annual ? "7-day free trial, then £70/yr — save 40% vs monthly. Everything unlocked. Cancel anytime." : tagline}
      </p>
      <div className="mt-5">
        <PlanButton plan="pro" label={label} highlight={highlight} interval={interval} />
      </div>
    </>
  );
}
