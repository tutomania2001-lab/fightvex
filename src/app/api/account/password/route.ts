import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import {
  getUserById, verifyPassword, hashPassword, updateUser, validatePassword,
  revokeUserSessions, createSession, rateLimited, SESSION_COOKIE, SESSION_TTL_SECONDS,
} from "@/lib/auth";
import { badOrigin } from "@/lib/origin";
import { clientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Change password: requires the current password (re-auth), then rehashes.
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

  const user = await getUserById(me.id);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (!(await verifyPassword(currentPassword, user.passwordHash)))
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });

  await updateUser(me.id, { passwordHash: await hashPassword(newPassword) });

  // Kill every existing session (any stolen/old session is now dead), then
  // re-issue one for THIS device so the user stays logged in where they are.
  await revokeUserSessions(me.id);
  const token = await createSession(me.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
