"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasAccess } from "@/lib/entitlements";

type Read = {
  aName: string;
  bName: string;
  aWin: number;
  bWin: number;
  favName: string;
  favWin: number;
  method: { ko: number; sub: number; dec: number };
  round: number | null;
  variance: "LOW" | "MEDIUM" | "HIGH";
  fairA: number | null;
  valueSide: string | null;
};

function Split({ m }: { m: { ko: number; sub: number; dec: number } }) {
  const parts = [
    { label: "KO/TKO", v: m.ko, c: "bg-blood" },
    { label: "Submission", v: m.sub, c: "bg-amber" },
    { label: "Decision", v: m.dec, c: "bg-edge" },
  ];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line/40">
        {parts.map((p) => <div key={p.label} className={p.c} style={{ width: `${p.v}%` }} />)}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        {parts.map((p) => <span key={p.label}>{p.label} <b className="text-fg">{p.v}%</b></span>)}
      </div>
    </div>
  );
}

// The exact, bettable read — gated to Pro. Free/logged-out users see a teaser +
// trial CTA; the real numbers are fetched from a Pro-only API, so they're never
// in the public HTML.
export function ProPrediction({ slug }: { slug: string }) {
  const { user, loading } = useAuth();
  const isPro = !!user && hasAccess(user.plan, "pro");
  const [data, setData] = useState<Read | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!isPro) return;
    let alive = true;
    setState("loading");
    fetch(`/api/predict/${slug}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && (setData(d), setState("ready")))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [isPro, slug]);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl panel" />;

  if (!isPro) {
    return (
      <div className="relative overflow-hidden rounded-2xl panel p-6">
        {/* blurred dummy bars purely as decoration — no real numbers in the DOM */}
        <div aria-hidden className="pointer-events-none select-none blur-sm">
          <div className="flex justify-between text-sm font-bold"><span>Win probability</span><span>—%</span></div>
          <div className="mt-2 h-3 rounded-full bg-line/50" />
          <div className="mt-4 h-3 rounded-full bg-line/40" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/70 px-6 text-center">
          <p className="text-[11px] uppercase tracking-wider text-edge">Pro</p>
          <p className="font-display text-lg font-bold uppercase">Unlock the full read</p>
          <p className="max-w-sm text-sm text-muted">Exact win probability, the method-of-victory split, likely round and the market <b>value lean</b> — the bettable edge.</p>
          <Link href="/pricing" className="btn-flare mt-1 rounded-md px-5 py-2.5 text-sm font-bold uppercase tracking-wide">Start 7-day free trial →</Link>
        </div>
      </div>
    );
  }

  if (state === "loading" || !data) return <div className="h-40 animate-pulse rounded-2xl panel" />;
  if (state === "error") return <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">Couldn&apos;t load the full read. Refresh to retry.</p>;

  const aLead = data.aWin >= data.bWin;
  return (
    <div className="space-y-5 rounded-2xl panel p-6">
      <div>
        <div className="flex items-center justify-between text-sm font-bold uppercase">
          <span className={aLead ? "text-fg" : "text-muted"}>{data.aName.split(" ").slice(-1)[0]} {data.aWin}%</span>
          <span className={!aLead ? "text-fg" : "text-muted"}>{data.bName.split(" ").slice(-1)[0]} {data.bWin}%</span>
        </div>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-line/40">
          <div className="bg-blue" style={{ width: `${data.aWin}%` }} />
          <div className="bg-blood" style={{ width: `${data.bWin}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Vex AI favors <b className="text-fg">{data.favName}</b> at {data.favWin}%
          {data.round ? ` — most likely round ${data.round}` : ""}. Confidence: {data.variance === "LOW" ? "high" : data.variance === "HIGH" ? "low (volatile)" : "medium"}.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">Method of victory ({data.favName.split(" ").slice(-1)[0]})</p>
        <Split m={data.method} />
      </div>

      {data.valueSide ? (
        <p className="rounded-md border border-edge/40 bg-edge/10 px-3 py-2 text-sm text-edge">
          <b>Value lean: {data.valueSide}</b> — Vex AI&apos;s probability diverges from the no-vig market here.
        </p>
      ) : (
        <p className="text-xs text-muted">No material edge vs the market on this bout (model ≈ the no-vig line).</p>
      )}
    </div>
  );
}
