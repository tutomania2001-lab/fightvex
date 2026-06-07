"use client";

import { useState } from "react";
import { CommitVerify } from "@/components/CommitVerify";
import type { Commitment } from "@/lib/commit";

// Small "verify the picks were locked before the fights" toggle for a card in
// the Upcoming / Past Picks tabs. Renders nothing if the card has no Bitcoin
// commitment yet.
export function PickVerify({ commit }: { commit?: Commitment }) {
  const [open, setOpen] = useState(false);
  if (!commit) return null;
  return (
    <div className="border-b border-line/60 bg-bg/30 px-4 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-edge/40 bg-edge/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-edge transition-colors hover:bg-edge/20"
      >
        <span aria-hidden>₿</span>
        {open ? "Hide proof" : "Verify these picks were locked before the fights"}
      </button>
      {open && <div className="mt-3"><CommitVerify c={commit} /></div>}
    </div>
  );
}
