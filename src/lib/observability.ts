// Lightweight, dependency-free error reporting (layer 12 — monitoring/loss).
// Always logs structured JSON (captured by Vercel's log drain). If
// ERROR_WEBHOOK_URL is set (a Slack/Discord incoming webhook or any collector),
// it also fires an alert so failures in money/auth paths are noticed in real
// time. Never throws — observability must not break the request it observes.
//
// Also forwards to Sentry when a DSN is configured (dormant otherwise).
export async function reportError(scope: string, err: unknown, meta?: Record<string, unknown>): Promise<void> {
  const detail = { at: new Date().toISOString(), scope, error: err instanceof Error ? err.message : String(err), ...meta };
  try { console.error(`[fightvex:${scope}]`, JSON.stringify(detail)); } catch { /* noop */ }

  // Structured capture to Sentry (best-effort; never throws into the caller).
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(err instanceof Error ? err : new Error(detail.error), { tags: { scope }, extra: meta });
    } catch { /* observability must not break the request */ }
  }

  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🚨 FightVex error [${scope}]: ${detail.error}` }),
      cache: "no-store",
    });
  } catch { /* alerting is best-effort */ }
}
