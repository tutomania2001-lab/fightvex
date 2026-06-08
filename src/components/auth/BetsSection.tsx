"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasAccess } from "@/lib/entitlements";
import { Panel } from "@/components/ui/Panel";

type Bet = {
  id: string;
  boutId: string | null;
  selection: string;
  stake: number;
  oddsTaken: number;
  closingOdds: number | null;
  result: "win" | "loss" | "push" | null;
  placedAt: string;
  settledAt: string | null;
};

// American odds -> decimal multiplier.
const amToDec = (a: number) => (a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a));
const fmtAm = (a: number) => (a > 0 ? `+${a}` : `${a}`);
const fmtU = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}u`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

// Profit in units for a settled bet.
function pnl(b: Bet): number {
  if (b.result === "win") return b.stake * (amToDec(b.oddsTaken) - 1);
  if (b.result === "loss") return -b.stake;
  return 0; // push / open
}
// CLV: did you beat the closing line? (your decimal / close decimal - 1)
function clv(b: Bet): number | null {
  if (b.closingOdds == null) return null;
  return amToDec(b.oddsTaken) / amToDec(b.closingOdds) - 1;
}

export function BetsSection() {
  const { user } = useAuth();
  const isPro = !!user && hasAccess(user.plan, "pro");

  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selection, setSelection] = useState("");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    let alive = true;
    fetch("/api/account/bets", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) {
          setBets(d.bets ?? []);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isPro]);

  const add = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);
      setBusy(true);
      try {
        const r = await fetch("/api/account/bets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selection, stake: Number(stake), oddsTaken: Number(odds) }),
        });
        const d = await r.json();
        if (!r.ok) {
          setErr(d.error || "Couldn't add bet.");
          return;
        }
        setBets(d.bets ?? []);
        setSelection("");
        setStake("");
        setOdds("");
      } finally {
        setBusy(false);
      }
    },
    [selection, stake, odds]
  );

  const patch = useCallback(async (id: string, body: Record<string, unknown>) => {
    const r = await fetch("/api/account/bets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (r.ok) setBets(d.bets ?? []);
  }, []);

  const remove = useCallback(async (id: string) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/account/bets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }, []);

  const summary = useMemo(() => {
    const settled = bets.filter((b) => b.result);
    const profit = settled.reduce((s, b) => s + pnl(b), 0);
    const staked = settled.reduce((s, b) => s + b.stake, 0);
    const w = settled.filter((b) => b.result === "win").length;
    const l = settled.filter((b) => b.result === "loss").length;
    const p = settled.filter((b) => b.result === "push").length;
    const clvs = bets.map(clv).filter((c): c is number => c != null);
    const avgClv = clvs.length ? clvs.reduce((s, c) => s + c, 0) / clvs.length : null;
    const open = bets.filter((b) => !b.result).length;
    return { profit, staked, roi: staked ? profit / staked : 0, w, l, p, avgClv, open, total: bets.length };
  }, [bets]);

  if (!isPro) {
    return (
      <Panel className="p-6">
        <h2 className="font-display text-xl font-bold uppercase">Bet Log</h2>
        <p className="mt-2 text-sm text-muted">
          Track your bets, measure closing-line value and your P&amp;L over time. This is a Pro tool.
        </p>
        <Link href="/pricing" className="btn-flare mt-4 inline-block rounded-md px-5 py-2.5 text-sm font-bold uppercase tracking-wide">
          Start 7-day free trial →
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase">Bet Log</h2>
        <p className="mt-1 text-sm text-muted">
          Log every bet, set the closing line to track your CLV, and watch your P&amp;L. Beating the close is the edge that
          matters. Units only — we never hold money. 21+.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "P&L (settled)", v: fmtU(summary.profit), tone: summary.profit >= 0 ? "text-edge" : "text-blood" },
          { k: "ROI", v: summary.staked ? fmtPct(summary.roi) : "—", tone: summary.roi >= 0 ? "text-edge" : "text-blood" },
          { k: "Record", v: `${summary.w}-${summary.l}${summary.p ? `-${summary.p}` : ""}`, tone: "text-fg" },
          { k: "Avg CLV", v: summary.avgClv == null ? "—" : fmtPct(summary.avgClv), tone: (summary.avgClv ?? 0) >= 0 ? "text-edge" : "text-blood" },
        ].map((s) => (
          <Panel key={s.k} className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted">{s.k}</p>
            <p className={`mt-1 font-display text-xl font-bold ${s.tone}`}>{s.v}</p>
          </Panel>
        ))}
      </div>

      {/* Add */}
      <Panel className="p-5">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[160px] text-xs uppercase tracking-wider text-muted">
            Bet on
            <input value={selection} onChange={(e) => setSelection(e.target.value)} placeholder="e.g. Topuria ML" className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-blood" />
          </label>
          <label className="w-24 text-xs uppercase tracking-wider text-muted">
            Stake (u)
            <input value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" placeholder="1" className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-blood" />
          </label>
          <label className="w-28 text-xs uppercase tracking-wider text-muted">
            Odds (US)
            <input value={odds} onChange={(e) => setOdds(e.target.value)} inputMode="numeric" placeholder="-150" className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-blood" />
          </label>
          <button type="submit" disabled={busy} className="btn-flare rounded-md px-5 py-2 text-sm font-bold uppercase tracking-wide disabled:opacity-60">
            {busy ? "Adding…" : "Log bet"}
          </button>
        </form>
        {err && <p className="mt-2 text-xs text-blood">{err}</p>}
      </Panel>

      {/* Ledger */}
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl panel" />
      ) : bets.length === 0 ? (
        <p className="rounded-lg border border-line bg-panel/60 p-4 text-sm text-muted">No bets logged yet. Add one above to start tracking CLV and P&amp;L.</p>
      ) : (
        <div className="space-y-2">
          {bets.map((b) => {
            const c = clv(b);
            const profit = b.result ? pnl(b) : null;
            return (
              <Panel key={b.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold uppercase">{b.selection}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {b.stake}u @ {fmtAm(b.oddsTaken)}
                      {c != null && <span className={c >= 0 ? "text-edge" : "text-blood"}> · CLV {fmtPct(c)}</span>}
                      {profit != null && <span className={profit >= 0 ? "text-edge" : "text-blood"}> · {fmtU(profit)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* result */}
                    <div className="flex gap-1">
                      {(["win", "loss", "push"] as const).map((res) => (
                        <button
                          key={res}
                          onClick={() => patch(b.id, { result: b.result === res ? null : res })}
                          className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${b.result === res ? (res === "win" ? "bg-edge text-black" : res === "loss" ? "bg-blood text-white" : "bg-steel text-white") : "border border-line text-muted hover:text-fg"}`}
                        >
                          {res[0]}
                        </button>
                      ))}
                    </div>
                    {/* closing odds for CLV */}
                    <input
                      defaultValue={b.closingOdds ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const n = v === "" ? null : Number(v);
                        if (v === "" ? b.closingOdds != null : n !== b.closingOdds) patch(b.id, { closingOdds: n });
                      }}
                      inputMode="numeric"
                      placeholder="close"
                      title="Closing odds (US) — for CLV"
                      className="w-20 rounded-md border border-line bg-bg px-2 py-1 text-xs text-fg outline-none focus:border-blood"
                    />
                    <button onClick={() => remove(b.id)} title="Delete" className="text-muted hover:text-blood">✕</button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
