import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { listWatch, addWatch, removeWatch } from "@/lib/account-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 120) => String(v ?? "").slice(0, max);

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ watchlist: await listWatch(me.id) });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  let b: { fighterId?: string; name?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!b.fighterId) return NextResponse.json({ error: "Missing fighter." }, { status: 400 });
  const watchlist = await addWatch(me.id, str(b.fighterId, 80), str(b.name));
  return NextResponse.json({ watchlist });
}

export async function DELETE(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const fighterId = new URL(req.url).searchParams.get("fighterId");
  if (!fighterId) return NextResponse.json({ error: "Missing fighter." }, { status: 400 });
  const watchlist = await removeWatch(me.id, fighterId);
  return NextResponse.json({ watchlist });
}
