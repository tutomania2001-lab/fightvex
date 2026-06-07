import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Auth gate for scheduled (cron) endpoints. FAILS CLOSED: with no CRON_SECRET
// set the endpoint is disabled (503) rather than world-open — so a misconfig
// can never expose a paid/expensive job. Prefers the Vercel Cron
// `Authorization: Bearer <secret>` header; a `?key=` fallback (for external
// schedulers) is compared in constant time. Returns an error response to
// return early, or null when authorized.
export function cronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer && safeEq(bearer, secret)) return null;
  const key = new URL(req.url).searchParams.get("key") || "";
  if (key && safeEq(key, secret)) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
