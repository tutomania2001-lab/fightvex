import { NextResponse } from "next/server";
import { reportError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Receives browser CSP violation reports (report-uri / report-to). Lets us SEE
// what a stricter policy would block BEFORE we enforce it — the safe way to
// tighten CSP without breaking the live site. Best-effort, never errors.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const r = body?.["csp-report"] || body;
    await reportError("csp", "CSP violation", {
      blocked: r?.["blocked-uri"] || r?.blockedURL,
      directive: r?.["violated-directive"] || r?.effectiveDirective,
      document: r?.["document-uri"] || r?.documentURL,
    });
  } catch { /* ignore malformed reports */ }
  return NextResponse.json({ received: true });
}
