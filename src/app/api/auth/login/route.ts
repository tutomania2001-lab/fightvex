import { NextResponse } from "next/server";
import {
  authEnabled,
  createSession,
  getUserByEmail,
  rateLimited,
  failCount,
  recordFailure,
  clearFailures,
  normalizeEmail,
  toPublicUser,
  verifyPassword,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";
import { clientIp } from "@/lib/ip";
import { badOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCT_MAX_FAILS = 8;          // lock an account after N recent failures…
const ACCT_WINDOW = 60 * 15;       // …within 15 minutes

export async function POST(req: Request) {
  const csrf = badOrigin(req);
  if (csrf) return csrf;
  if (!authEnabled)
    return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = String(body.email || "");
  const password = String(body.password || "");
  const acct = normalizeEmail(email);

  // Two-layer brute-force defense: per-IP (slows one host) AND per-account
  // (slows a distributed, IP-rotating attack on a single victim).
  if (await rateLimited("login", clientIp(req), 10, 60 * 15))
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  if (acct && (await failCount("login_acct", acct)) >= ACCT_MAX_FAILS)
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  // Generic error on both branches — never reveal whether the email exists.
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (acct) await recordFailure("login_acct", acct, ACCT_WINDOW);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (acct) await clearFailures("login_acct", acct); // reset on success

  const token = await createSession(user.id);
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
