"use client";

import { useEffect, useState } from "react";
import type { PastCard, UpcomingCard } from "@/lib/predictions";
import type { Commitment } from "@/lib/commit";

export type PicksResp = { enabled: boolean; cards: PastCard[]; upcoming: UpcomingCard[]; pending: number; commitments?: Commitment[] };

// Shared loader for the Upcoming + Past Picks tabs (both read the same endpoint).
export function usePicks() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<PicksResp | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/predictions/past")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setData(d); setState("ready"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);
  return { state, data };
}

export const fmtPicksDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export const pctRound = (v: number) => `${Math.round(v * 100)}%`;

// Site reveal/stagger motion (matches the division accordion + reveal classes).
export const EASE = [0.4, 0, 0.2, 1] as const;
export const tabReveal = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};
