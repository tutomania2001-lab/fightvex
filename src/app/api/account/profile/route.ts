import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { updateUser, validateName, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Update editable profile fields (currently: name). Email is immutable here
// because it's the account key / future Stripe customer email.
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

  const updated = await updateUser(me.id, { name: name.trim() });
  if (!updated) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ user: toPublicUser(updated) });
}
