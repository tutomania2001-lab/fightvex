import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabaseEnabled } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (supabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut(); // clears the Supabase session cookies
  }
  return NextResponse.json({ ok: true });
}
