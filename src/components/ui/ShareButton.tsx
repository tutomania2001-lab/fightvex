"use client";

import { useState } from "react";
import posthog from "posthog-js";

// Share the current page (which renders a branded OG card when posted). Uses the
// native share sheet on mobile, falls back to copy-link on desktop.
export function ShareButton({ text, label = "Share", className = "" }: { text?: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function onShare() {
    const url = typeof location !== "undefined" ? location.href : "https://fightvex.com";
    const payload = text ? `${text} ${url}` : url;
    try { posthog.capture("share_clicked", { url }); } catch { /* ignore */ }
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "FightVex", text, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch { /* user cancelled */ }
  }
  return (
    <button onClick={onShare} className={className || "inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:border-steel"}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? "Link copied" : label}
    </button>
  );
}
