import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { pingActivity } from "@/lib/account-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Records a daily visit (advances the activity streak). Called once on hub load.
export async function POST() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const stats = await pingActivity(me.id);
  return NextResponse.json({ stats });
}
