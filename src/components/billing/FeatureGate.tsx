"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasAccess, PLAN_LABEL, type Plan } from "@/lib/entitlements";

// Locks a premium tool behind a plan. Insufficient plans see a branded locked
// card — a soft, blurred red/blue corner flare (the FightVex signature) behind
// a frosted panel with a clear "content unavailable" notice and upgrade CTA.
// Client-side so the host page stays statically rendered (SEO).
export function FeatureGate({
  minPlan,
  title,
  description,
  children,
}: {
  minPlan: Plan;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const plan: Plan = user?.plan ?? "free";

  // While we don't yet know the plan, show the locked placeholder rather than
  // briefly exposing the tool to free users.
  if (!loading && hasAccess(plan, minPlan)) return <>{children}</>;

  const planTag = minPlan === "elite" ? "text-blood-dim" : "text-blue";
  const warn = user
    ? `Content unavailable on the ${PLAN_LABEL[plan]} plan.`
    : "Content unavailable. Create a free account to get started.";

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-line">
      {/* Blurred red-left / blue-right brand flare */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{
          background:
            "radial-gradient(55% 130% at 0% 50%, rgba(225,6,0,0.34), transparent 60%)," +
            "radial-gradient(55% 130% at 100% 50%, rgba(46,144,255,0.30), transparent 60%)",
        }}
      />
      {/* Frosted darkening so the content stays crisp over the flare */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-bg/45" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-5 text-center">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="text-fg" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <span className={`mt-4 text-[11px] font-bold uppercase tracking-[0.2em] ${planTag}`}>
          {PLAN_LABEL[minPlan]} feature
        </span>
        <h3 className="mt-3 font-display text-xl font-bold uppercase">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          {warn}
          {description ? ` ${description}` : ""}
        </p>
        {loading ? (
          <div className="mt-5 h-11 w-40 animate-pulse rounded-lg bg-white/[0.06]" />
        ) : (
          <Link
            href={user ? "/pricing" : "/login?mode=signup&next=/pricing"}
            className="btn-flare mt-5 inline-block rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wide"
          >
            {user ? `Upgrade to ${PLAN_LABEL[minPlan]}` : "Create account"}
          </Link>
        )}
      </div>
    </div>
  );
}
