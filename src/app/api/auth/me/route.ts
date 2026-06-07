import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the signed-in user (safe shape) or { user: null }. Used by the
// client AuthProvider to hydrate auth state without making public pages dynamic.
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user });
}
