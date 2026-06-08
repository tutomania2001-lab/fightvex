import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { hasAccess } from "@/lib/entitlements";
import { listBets, addBet, updateBet, deleteBet, type Bet } from "@/lib/account-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 120) => String(v ?? "").slice(0, max).trim();
const RESULTS = ["win", "loss", "push"] as const;

// Bet log / bankroll ledger — a Pro feature. RLS already scopes rows to the
// user; we also gate the whole route on plan so free users can't write.
async function gate() {
  const me = await currentUser();
  if (!me) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (!hasAccess(me.plan, "pro")) return { error: NextResponse.json({ error: "Pro required." }, { status: 403 }) };
  return { me };
}

export async function GET() {
  const g = await gate();
  if (g.error) return g.error;
  return NextResponse.json({ bets: await listBets(g.me.id) });
}

export async function POST(req: Request) {
  const g = await gate();
  if (g.error) return g.error;
  let b: { selection?: string; stake?: number; oddsTaken?: number; boutId?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const selection = str(b.selection, 80);
  const stake = Number(b.stake);
  const oddsTaken = Number(b.oddsTaken);
  if (!selection) return NextResponse.json({ error: "Add what you bet on." }, { status: 400 });
  if (!Number.isFinite(stake) || stake <= 0 || stake > 1e6) return NextResponse.json({ error: "Stake must be a positive number." }, { status: 400 });
  if (!Number.isInteger(oddsTaken) || oddsTaken === 0 || Math.abs(oddsTaken) < 100 || Math.abs(oddsTaken) > 100000)
    return NextResponse.json({ error: "Odds must be American (e.g. -150 or +200)." }, { status: 400 });
  const bets = await addBet(g.me.id, { selection, stake, oddsTaken, boutId: b.boutId ? str(b.boutId, 80) : null });
  return NextResponse.json({ bets });
}

export async function PATCH(req: Request) {
  const g = await gate();
  if (g.error) return g.error;
  let b: { id?: string; result?: string | null; closingOdds?: number | null };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!b.id) return NextResponse.json({ error: "Missing bet." }, { status: 400 });
  const patch: { result?: Bet["result"]; closingOdds?: number | null } = {};
  if (b.result !== undefined) {
    if (b.result !== null && !RESULTS.includes(b.result as (typeof RESULTS)[number]))
      return NextResponse.json({ error: "Bad result." }, { status: 400 });
    patch.result = (b.result as Bet["result"]) ?? null;
  }
  if (b.closingOdds !== undefined) {
    if (b.closingOdds === null) patch.closingOdds = null;
    else {
      const c = Number(b.closingOdds);
      if (!Number.isInteger(c) || c === 0 || Math.abs(c) < 100 || Math.abs(c) > 100000)
        return NextResponse.json({ error: "Closing odds must be American." }, { status: 400 });
      patch.closingOdds = c;
    }
  }
  const bets = await updateBet(g.me.id, str(b.id, 80), patch);
  return NextResponse.json({ bets });
}

export async function DELETE(req: Request) {
  const g = await gate();
  if (g.error) return g.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing bet." }, { status: 400 });
  return NextResponse.json({ bets: await deleteBet(g.me.id, id) });
}
