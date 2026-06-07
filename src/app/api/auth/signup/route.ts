import { NextResponse } from "next/server";
import {
  authEnabled,
  createSession,
  createUser,
  rateLimited,
  toPublicUser,
  validateSignup,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";
import { clientIp } from "@/lib/ip";
import { badOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  if (!authEnabled)
    return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  // Self-serve registration is open: users create their own account (free plan
  // by default) and later upgrade by purchasing a plan. Rate-limited per IP.
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = String(body.email || "");
  const password = String(body.password || "");
  const name = String(body.name || "");

  // Throttle signups per IP to curb automated account spam.
  if (await rateLimited("signup", clientIp(req), 20, 60 * 60))
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const invalid = validateSignup(email, password, name);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const result = await createUser(email, password, name);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });

  const token = await createSession(result.user.id);
  const res = NextResponse.json({ user: toPublicUser(result.user) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
