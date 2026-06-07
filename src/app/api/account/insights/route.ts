import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { listInsights, saveInsight, deleteInsight } from "@/lib/account-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clamp01 = (n: unknown) => Math.max(0, Math.min(1, Number(n) || 0));
const str = (v: unknown, max = 120) => String(v ?? "").slice(0, max);

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ insights: await listInsights(me.id) });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!b.aId || !b.bId)
    return NextResponse.json({ error: "Missing fighters." }, { status: 400 });

  // Sanitize/clamp everything — never trust the client payload.
  const insight = await saveInsight(me.id, {
    aId: str(b.aId, 80),
    aName: str(b.aName),
    bId: str(b.bId, 80),
    bName: str(b.bName),
    winnerName: str(b.winnerName),
    method: str(b.method, 40),
    confidence: clamp01(b.confidence),
    probA: clamp01(b.probA),
    rounds: Math.max(1, Math.min(5, Math.round(Number(b.rounds) || 3))),
    runs: Math.max(1, Math.min(100000, Math.round(Number(b.runs) || 1000))),
    note: b.note ? str(b.note, 280) : undefined,
  });
  return NextResponse.json({ insight });
}

export async function DELETE(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await deleteInsight(me.id, id);
  return NextResponse.json({ ok: true });
}
