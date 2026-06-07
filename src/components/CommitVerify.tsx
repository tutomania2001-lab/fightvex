"use client";

import { useState } from "react";
import type { Commitment } from "@/lib/commit";

// In-browser verification: the visitor recomputes the SHA-256 of the exact pick
// string THEMSELVES (Web Crypto — no trust in our server) and confirms it equals
// the hash that was anchored in Bitcoin before the fight. We can't back-date.
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

function download(name: string, b64: string) {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: "application/octet-stream" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export function CommitVerify({ c }: { c: Commitment }) {
  const [state, setState] = useState<"idle" | "ok" | "bad">("idle");
  const [open, setOpen] = useState(false);
  const verify = async () => {
    try { setState((await sha256hex(c.canonical)) === c.hash ? "ok" : "bad"); }
    catch { setState("bad"); }
  };
  const beforeFight = c.bitcoin ? new Date(c.bitcoin.time).getTime() < new Date(c.eventDate).getTime() : null;

  return (
    <div className="overflow-hidden rounded-xl border border-line/70 bg-panel/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 bg-bg/40 px-4 py-3">
        <div className="min-w-0">
          <h4 className="truncate font-display text-sm font-bold uppercase">{c.eventName}</h4>
          <p className="text-[11px] text-muted">Picks locked {fmt(c.committedAt)} · fights {fmt(c.eventDate)}</p>
        </div>
        {c.bitcoin ? (
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${beforeFight ? "border-edge/50 bg-edge/10 text-edge" : "border-blood/50 bg-blood/10 text-blood"}`}>
            ₿ Bitcoin block #{c.bitcoin.height}{beforeFight ? " · before the fight ✓" : ""}
          </span>
        ) : c.ots ? (
          <span className="shrink-0 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber">₿ Anchored · awaiting Bitcoin block</span>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={verify} className="btn-toggle rounded-md px-4 py-1.5 text-sm font-semibold uppercase tracking-wide">
            Verify in my browser
          </button>
          {state === "ok" && <span className="text-sm font-semibold text-edge">✓ Hash matches — these exact picks are the ones anchored in Bitcoin.</span>}
          {state === "bad" && <span className="text-sm font-semibold text-blood">✗ Hash mismatch.</span>}
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-fg">{open ? "Hide" : "Show"} details</button>
        </div>

        {open && (
          <div className="space-y-2 rounded-lg border border-line bg-bg/50 p-3 text-[11px] text-muted">
            <p className="font-semibold uppercase tracking-wider text-faint">Exact data that was hashed (SHA-256)</p>
            <p className="break-all font-mono text-fg/80">{c.canonical}</p>
            <p className="font-semibold uppercase tracking-wider text-faint">SHA-256 hash (anchored in Bitcoin)</p>
            <p className="break-all font-mono text-edge">{c.hash}</p>
            {c.bitcoin && <p>Bitcoin attestation: block <b className="text-fg">#{c.bitcoin.height}</b> mined <b className="text-fg">{fmt(c.bitcoin.time)}</b> — set by Bitcoin&apos;s miners, not by us.</p>}
            {c.ots && (
              <button type="button" onClick={() => download(`${c.eventSlug}.ots`, c.ots)} className="text-blood hover:underline">
                Download the OpenTimestamps proof (.ots) to verify independently →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
