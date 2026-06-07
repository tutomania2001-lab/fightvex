import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { validatePassword, rateLimited } from "@/lib/auth";
import { badOrigin } from "@/lib/origin";
import { clientIp } from "@/lib/ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Change password: re-auth with the current password, then update via Supabase.
export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (await rateLimited("pwchange", clientIp(req), 10, 60 * 15))
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  const invalid = validatePassword(newPassword);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  // Re-authenticate to prove the current password before allowing the change.
  const { error: reauth } = await supabase.auth.signInWithPassword({
    email: me.email,
    password: currentPassword,
  });
  if (reauth) return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
