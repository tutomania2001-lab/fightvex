"use client";

import { useState, type ReactNode } from "react";
import { UpcomingPicks } from "./UpcomingPicks";
import { PastPicks } from "./PastPicks";
import { AccuracyPanel } from "./AccuracyPanel";

// Tab switcher around the simulator. The simulator (server-rendered, reads URL
// params) is passed as children and kept mounted (hidden, not unmounted) so its
// state survives a trip to the other tabs and back.
export function SimTabs({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<"sim" | "upcoming" | "past" | "accuracy">("sim");
  // Match the simulator's own control bar (btn-toggle + is-on glass buttons).
  const tabCls = (active: boolean) =>
    `btn-toggle rounded-md px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${active ? "is-on" : ""}`;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTab("sim")} className={tabCls(tab === "sim")} aria-pressed={tab === "sim"}>
          Simulator
        </button>
        <button type="button" onClick={() => setTab("upcoming")} className={tabCls(tab === "upcoming")} aria-pressed={tab === "upcoming"}>
          Upcoming
        </button>
        <button type="button" onClick={() => setTab("past")} className={tabCls(tab === "past")} aria-pressed={tab === "past"}>
          Past Picks
        </button>
        <button type="button" onClick={() => setTab("accuracy")} className={tabCls(tab === "accuracy")} aria-pressed={tab === "accuracy"}>
          Accuracy
        </button>
      </div>
      <div className={tab === "sim" ? "" : "hidden"}>{children}</div>
      {tab === "upcoming" && <UpcomingPicks />}
      {tab === "past" && <PastPicks />}
      {tab === "accuracy" && <AccuracyPanel />}
    </div>
  );
}
