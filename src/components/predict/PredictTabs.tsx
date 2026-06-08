"use client";

import { useState, type ReactNode } from "react";
import { UpcomingPicks } from "@/components/sim/UpcomingPicks";
import { PastPicks } from "@/components/sim/PastPicks";
import { AccuracyPanel } from "@/components/sim/AccuracyPanel";
import { FeatureGate } from "@/components/billing/FeatureGate";

// The Predictions hub. Forward-looking picks (the matchup list + Upcoming) are
// Pro-only; the historical proof (Past Picks + Accuracy) stays public so it can
// still convince non-members and rank. `children` is the server-rendered
// upcoming-matchups list (shown under the Predictions tab).
export function PredictTabs({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<"predictions" | "upcoming" | "past" | "accuracy">("predictions");
  const cls = (active: boolean) =>
    `btn-toggle rounded-md px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${active ? "is-on" : ""}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTab("predictions")} className={cls(tab === "predictions")} aria-pressed={tab === "predictions"}>Predictions</button>
        <button type="button" onClick={() => setTab("upcoming")} className={cls(tab === "upcoming")} aria-pressed={tab === "upcoming"}>Upcoming Picks</button>
        <button type="button" onClick={() => setTab("past")} className={cls(tab === "past")} aria-pressed={tab === "past"}>Past Picks</button>
        <button type="button" onClick={() => setTab("accuracy")} className={cls(tab === "accuracy")} aria-pressed={tab === "accuracy"}>Accuracy</button>
      </div>

      {/* Predictions list — Pro (server-rendered list passed as children) */}
      <div className={tab === "predictions" ? "" : "hidden"}>
        <FeatureGate minPlan="pro" title="AI Predictions" description="Vex AI's pick and confidence for every upcoming bout, plus the full read on each fight. A Pro tool.">
          {children}
        </FeatureGate>
      </div>

      {tab === "upcoming" && (
        <FeatureGate minPlan="pro" title="Upcoming Picks" description="Vex AI's locked-in, Bitcoin-timestamped picks for every upcoming card, in advance. A Pro tool.">
          <UpcomingPicks />
        </FeatureGate>
      )}

      {/* Past Picks + Accuracy — public proof / track record */}
      {tab === "past" && <PastPicks />}
      {tab === "accuracy" && <AccuracyPanel />}
    </div>
  );
}
