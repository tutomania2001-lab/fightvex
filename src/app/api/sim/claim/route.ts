import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { redis } from "@/lib/auth";
import { badOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One free real simulation per account. Pro/Elite are unlimited (remaining: -1).
// Free users get exactly one, tracked in KV (survives reloads). Guests get none.
const key = (id: string) => `freesim:${id}`;

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ remaining: 0, plan: "guest" });
  if (me.plan !== "free") return NextResponse.json({ remaining: -1, plan: me.plan });
  const used = await redis<string | null>(["GET", key(me.id)]);
  return NextResponse.json({ remaining: used ? 0 : 1, plan: "free" });
}

export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  const me = await currentUser();
  if (!me) return NextResponse.json({ ok: false, remaining: 0, error: "Log in to run a free simulation." }, { status: 401 });
  if (me.plan !== "free") return NextResponse.json({ ok: true, remaining: -1 });
  // Atomic claim: SET ... NX returns "OK" only the first time.
  const claimed = await redis<string | null>(["SET", key(me.id), "1", "NX"]);
  if (claimed === null) return NextResponse.json({ ok: false, remaining: 0, error: "You've used your free simulation." });
  return NextResponse.json({ ok: true, remaining: 0 });
}
