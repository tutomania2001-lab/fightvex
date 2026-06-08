"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import posthog from "posthog-js";
import { useAuth } from "@/components/auth/AuthProvider";

type P = { name: string; slug: string; record: string; img: string };
export type PickBout = { id: string; wc: string; a: P; b: P; vexSide: "A" | "B"; vexConf: string };

const last = (n: string) => n.split(" ").slice(-1)[0];

export function PickEm({ eventSlug, eventName, bouts }: { eventSlug: string; eventName: string; bouts: PickBout[] }) {
  const { user } = useAuth();
  const [picks, setPicks] = useState<Record<string, "A" | "B">>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load any saved picks for this card.
  useEffect(() => {
    if (!user) return;
    fetch(`/api/pickem?event=${encodeURIComponent(eventSlug)}`)
      .then((r) => r.json()).then((d) => { if (d?.picks) setPicks(d.picks); }).catch(() => {});
  }, [user, eventSlug]);

  const pick = (id: string, side: "A" | "B") => { setPicks((p) => ({ ...p, [id]: side })); setSaved(false); };

  const done = Object.keys(picks).length;
  const agree = useMemo(() => bouts.filter((b) => picks[b.id] && picks[b.id] === b.vexSide).length, [picks, bouts]);
  const decided = useMemo(() => bouts.filter((b) => picks[b.id]).length, [picks, bouts]);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const r = await fetch("/api/pickem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: eventSlug, picks }) });
      if (r.ok) { setSaved(true); posthog.capture("pickem_saved", { event: eventSlug, picks: done }); }
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  const Side = ({ b, side }: { b: PickBout; side: "A" | "B" }) => {
    const f = side === "A" ? b.a : b.b;
    const on = picks[b.id] === side;
    return (
      <button onClick={() => pick(b.id, side)}
        className={`flex flex-1 items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${on ? "border-blue bg-blue/10" : "border-line bg-bg/40 hover:border-steel"}`}>
        <div className="relative h-10 w-9 shrink-0">
          <Image src={f.img || "/fighters/unknown-v5.png"} alt="" fill sizes="40px" className="object-contain object-bottom" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold uppercase leading-tight">{last(f.name)}</p>
          <p className="tnum text-[10px] text-muted">{f.record}</p>
        </div>
      </button>
    );
  };

  return (
    <div>
      <div className="reveal sticky top-16 z-20 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <p className="text-sm text-muted"><b className="text-fg">{decided}/{bouts.length}</b> picked{decided ? <> · with Vex AI on <b className="text-edge">{agree}</b></> : null}</p>
        {user ? (
          <button onClick={save} disabled={busy || !decided} className="btn-flare rounded-md px-5 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50">
            {saved ? "Saved ✓" : busy ? "Saving…" : "Save picks"}
          </button>
        ) : (
          <Link href="/login?mode=signup&next=/play" className="btn-flare rounded-md px-5 py-2 text-xs font-bold uppercase tracking-wide">Sign up to save</Link>
        )}
      </div>

      <div className="reveal-stagger space-y-3">
        {bouts.map((b) => {
          const chosen = picks[b.id];
          const agrees = chosen && chosen === b.vexSide;
          const vexFav = b.vexSide === "A" ? b.a : b.b;
          return (
            <div key={b.id} className="reveal panel rounded-xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted">{b.wc}</span>
                {chosen && (
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${agrees ? "text-edge" : "text-blood"}`}>
                    {agrees ? "Vex AI agrees" : `Vex backs ${last(vexFav.name)} · ${b.vexConf}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Side b={b} side="A" />
                <span className="shrink-0 font-display text-[10px] font-bold text-muted">VS</span>
                <Side b={b} side="B" />
              </div>
            </div>
          );
        })}
      </div>

      {decided === bouts.length && bouts.length > 0 && (
        <div className="reveal mt-5 rounded-2xl panel p-6 text-center">
          <p className="font-display text-xl font-bold uppercase">You&apos;re with Vex AI on <span className="text-edge">{agree}</span> of {bouts.length}</p>
          <p className="mt-1 text-sm text-muted">{agree === bouts.length ? "Full agreement — you think like the model." : `You're fading the AI on ${bouts.length - agree}. Want the exact win % and the reasoning on every bout?`}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {!user && <Link href="/login?mode=signup&next=/play" className="rounded-md border border-line px-5 py-2.5 text-sm font-semibold uppercase tracking-wide hover:border-steel">Create free account</Link>}
            <Link href="/pricing" className="btn-flare rounded-md px-5 py-2.5 text-sm font-bold uppercase tracking-wide">See the full reads →</Link>
          </div>
          <p className="mt-3 text-[11px] text-faint">Predictions are estimates, not advice. 21+.</p>
        </div>
      )}
    </div>
  );
}
