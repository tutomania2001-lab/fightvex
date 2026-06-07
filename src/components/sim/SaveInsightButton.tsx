"use client";

import { useState } from "react";
import type { Fighter } from "@/lib/types";
import type { SimResult } from "@/lib/sim";
import { useAuth } from "@/components/auth/AuthProvider";

// Saves the current simulation to the signed-in user's account ("insights").
// Logged-out users get a prompt to log in. Compact payload only.
export function SaveInsightButton({
  a,
  b,
  result,
  runs,
}: {
  a: Fighter;
  b: Fighter;
  result: SimResult;
  runs: number;
}) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (loading) return null;

  const winner = result.headline.winnerSide === "A" ? a : b;

  async function save() {
    if (state === "saving" || state === "saved") return;
    setState("saving");
    try {
      const r = await fetch("/api/account/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aId: a.id,
          aName: a.name,
          bId: b.id,
          bName: b.name,
          winnerName: winner.name,
          method: result.headline.method,
          confidence: result.headline.confidence,
          probA: result.probA,
          rounds: result.roundDist.aFinish.length,
          runs,
        }),
      });
      setState(r.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  if (!user) {
    return (
      <a href="/login?next=/simulator" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1 font-semibold text-fg transition-colors hover:border-steel">
        ☆ Save
      </a>
    );
  }

  return (
    <button
      onClick={save}
      disabled={state === "saving" || state === "saved"}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1 font-semibold text-fg transition-colors hover:border-steel disabled:opacity-70"
    >
      {state === "saved" ? "★ Saved" : state === "saving" ? "Saving…" : state === "error" ? "Retry save" : "☆ Save"}
    </button>
  );
}
