import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { validateName } from "@/lib/auth";
import { updateProfileName } from "@/lib/supabase/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Update editable profile fields (currently: name). Email is immutable here
// because it's the account key / Stripe customer email.
export async function PATCH(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = String(body.name || "");
  const invalid = validateName(name);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  await updateProfileName(me.id, name.trim());
  const user = await currentUser();
  return NextResponse.json({ user });
}
