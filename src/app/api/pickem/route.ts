import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { redis } from "@/lib/auth";
import { badOrigin } from "@/lib/origin";
import { upcomingEvents } from "@/lib/data/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free "pick'em vs the AI": a logged-in user saves their winner pick for each
// bout on an upcoming card. Stored in KV per user+event; only editable while the
// card is still upcoming. Scoring vs results is layered on later.
const key = (uid: string, slug: string) => `pickem:${uid}:${slug}`;

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ loggedIn: false, picks: {} });
  const slug = new URL(req.url).searchParams.get("event") || "";
  if (!slug) return NextResponse.json({ loggedIn: true, picks: {} });
  const raw = await redis<string | null>(["GET", key(me.id, slug)]);
  let picks: Record<string, "A" | "B"> = {};
  try { if (raw) picks = (JSON.parse(raw) as { picks?: Record<string, "A" | "B"> }).picks || {}; } catch { /* ignore */ }
  return NextResponse.json({ loggedIn: true, picks });
}

export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  const me = await currentUser();
  if (!me) return NextResponse.json({ ok: false, error: "Log in to save your picks." }, { status: 401 });

  let body: { event?: string; picks?: Record<string, string> };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 }); }
  const slug = String(body.event || "");
  const ev = upcomingEvents().find((e) => e.slug === slug);
  if (!ev) return NextResponse.json({ ok: false, error: "That card isn't open for picks." }, { status: 400 });

  // Keep only valid bout ids with an A/B side.
  const valid = new Set(ev.matchups.map((m) => m.id));
  const picks: Record<string, "A" | "B"> = {};
  for (const [k, v] of Object.entries(body.picks || {})) {
    if (valid.has(k) && (v === "A" || v === "B")) picks[k] = v;
  }
  await redis(["SET", key(me.id, slug), JSON.stringify({ picks, at: new Date().toISOString() })]);
  return NextResponse.json({ ok: true, saved: Object.keys(picks).length });
}
