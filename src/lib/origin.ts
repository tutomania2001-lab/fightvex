import { NextResponse } from "next/server";

// CSRF defense-in-depth for state-changing requests. Browsers always send an
// `Origin` header on cross-origin (and same-origin non-GET) fetch/XHR, so a
// mismatch against our own host means the request came from another site —
// reject it. A missing Origin is allowed (some privacy tools / native clients
// strip it) because SameSite=Lax session cookies already block cross-site use;
// this is an extra layer, not the only one. Returns a 403 response to return
// early, or null when the request is allowed to proceed.
export function badOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* malformed Origin → treat as bad */
  }
  return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
}
