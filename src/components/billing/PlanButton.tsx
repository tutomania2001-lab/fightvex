"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { PLAN_RANK, type Plan } from "@/lib/entitlements";

// Pricing CTA. Enforces "you need an account to buy":
//  - logged out  -> send to register (then back to pricing)
//  - logged in    -> start Stripe checkout for this plan
//  - current/owned -> shows state, no action
export function PlanButton({
  plan,
  label,
  highlight,
}: {
  plan: Plan;
  label: string;
  highlight?: boolean;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `block w-full rounded-md py-3 text-center text-sm font-bold uppercase tracking-wide ${
    highlight ? "btn-flare" : "border border-line text-fg hover:border-steel"
  }`;
  // Static, non-actionable states (owned / current / you're in) — always the
  // plain monochrome style, never the flare.
  const baseStatic =
    "block w-full cursor-default rounded-md border border-line py-3 text-center text-sm font-bold uppercase tracking-wide text-muted";

  // Free tier: just get them an account.
  if (plan === "free") {
    if (user) return <div className={baseStatic}>You&apos;re in</div>;
    return (
      <button onClick={() => router.push("/login?mode=signup&next=/pricing")} className={base}>
        {label}
      </button>
    );
  }

  const current = user && user.plan === plan;
  const owned = user && PLAN_RANK[user.plan] >= PLAN_RANK[plan];

  async function buy() {
    if (loading) return;
    if (!user) {
      router.push(`/login?mode=signup&next=/pricing`);
      return;
    }
    setBusy(true);
    setError(null);
    posthog.capture("checkout_started", { plan });
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) {
        window.location.assign(j.url); // redirect to Stripe Checkout
        return;
      }
      setError(j.error || "Couldn't start checkout.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (current) return <div className={baseStatic}>Current plan</div>;
  if (owned) return <div className={baseStatic}>Included</div>;

  return (
    <div>
      <button onClick={buy} disabled={busy} className={`${base} disabled:opacity-60`}>
        {busy ? "Starting…" : !user ? "Create account to buy" : label}
      </button>
      {error && <p className="mt-2 text-center text-xs text-blood">{error}</p>}
    </div>
  );
}
