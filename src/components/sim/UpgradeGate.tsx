"use client";

import Link from "next/link";

// Shown when a free / logged-out user tries to run a new simulation. The
// default preview run stays visible behind the overlay.
export function UpgradeGate({ loggedIn, onClose }: { loggedIn: boolean; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative isolate w-full max-w-sm overflow-hidden rounded-2xl border border-line p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Blurred red/blue brand flare */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
          style={{
            background:
              "radial-gradient(55% 130% at 0% 50%, rgba(225,6,0,0.34), transparent 60%)," +
              "radial-gradient(55% 130% at 100% 50%, rgba(46,144,255,0.30), transparent 60%)",
          }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-bg/70" />
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-fg" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <h2 className="font-display text-2xl font-bold uppercase">Upgrade your plan</h2>
        <p className="mt-2 text-sm text-muted">
          Running your own fight simulations is a Pro feature. The free preview shows one
          sample matchup. Upgrade to simulate any fight, re-run with custom parameters and
          save your insights.
        </p>
        <div className="mt-6 space-y-3">
          <Link
            href="/pricing"
            className="btn-flare block w-full rounded-md py-2.5 text-sm font-bold uppercase tracking-wide"
          >
            View plans
          </Link>
          {!loggedIn && (
            <Link
              href="/login?next=/simulator"
              className="block w-full rounded-md border border-line py-2.5 text-sm font-semibold uppercase tracking-wide text-muted hover:border-steel hover:text-fg"
            >
              Already a member? Log in
            </Link>
          )}
          <button
            onClick={onClose}
            className="w-full py-1 text-xs uppercase tracking-wide text-muted hover:text-fg"
          >
            Keep viewing preview
          </button>
        </div>
      </div>
    </div>
  );
}
