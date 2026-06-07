"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Real ESPN fight history (from /api/espn/history/[id]). No fabricated data:
// loading -> real fights -> or a clear empty state. Missing fields show "N/A".
interface Fight {
  date: string | null;
  opponent: string;
  opponentSlug?: string;
  win: boolean | null;
  division?: string;
  round?: number;
  method: string;
}

function fmtDate(d: string | null) {
  if (!d) return "N/A";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "N/A" : t.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function CareerHistory({ athleteId }: { athleteId: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [fights, setFights] = useState<Fight[]>([]);

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetch(`/api/espn/history/${athleteId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) { setFights(d.fights || []); setState("ready"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [athleteId]);

  if (state === "loading") {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-panel-2/60" />
        ))}
      </div>
    );
  }
  if (state === "error" || fights.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">
        Official career history unavailable.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 pr-3">Result</th>
              <th className="py-2 pr-3">Opponent</th>
              <th className="py-2 pr-3">Division</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {fights.map((f, i) => {
              const tone = f.win === null ? "text-muted" : f.win ? "text-edge" : "text-blood";
              return (
              <tr key={i} className="border-b border-line-soft last:border-0">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-display text-xs font-bold ${
                      f.win === null ? "bg-panel-2 text-muted" : f.win ? "bg-edge/15 text-edge" : "bg-blood/15 text-blood"
                    }`}>
                      {f.win === null ? "—" : f.win ? "W" : "L"}
                    </span>
                    {/* how it ended — same color as the W/L */}
                    <span className={`whitespace-nowrap text-xs font-semibold ${tone}`}>{f.method || "N/A"}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 font-medium text-fg">
                  {f.opponentSlug
                    ? <Link href={`/fighters/${f.opponentSlug}`} className="hover:text-blood">{f.opponent}</Link>
                    : f.opponent}
                </td>
                <td className="py-2 pr-3 text-muted">{f.division || "N/A"}</td>
                <td className="py-2 text-muted">{fmtDate(f.date)}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-faint">Results &amp; round: ESPN · Finish method (KO/TKO/Submission/Decision): Wikipedia. Falls back to ESPN’s Decision/Finish label when unverified.</p>
    </div>
  );
}
