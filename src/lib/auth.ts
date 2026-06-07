// ============================================================
// FightVex — accounts & auth (server-only).
//
// Real email + password authentication backed by Upstash Redis
// (the same KV the odds feed uses, via raw REST — no SDK). Designed
// to be secure and Stripe-ready:
//   • passwords hashed with scrypt (Node built-in) + per-user salt
//   • sessions are opaque random tokens stored server-side in Redis
//     (revocable; the cookie holds nothing sensitive)
//   • each user carries `plan` + `stripeCustomerId` so billing slots
//     in later with no schema change.
//
// Redis keys:
//   user:<id>           -> JSON UserRecord (includes passwordHash)
//   email:<emailLower>  -> userId            (enforces unique email)
//   session:<token>     -> userId            (TTL = SESSION_TTL_SECONDS)
//   rl:<bucket>:<ip>    -> attempt counter   (brute-force throttle)
//
// Required env (free Upstash tier — already set for the odds feed):
//   KV_REST_API_URL / UPSTASH_REDIS_REST_URL
//   KV_REST_API_TOKEN / UPSTASH_REDIS_REST_TOKEN
// ============================================================
// NOTE: server-only module. Uses Node `crypto` + Redis token — only ever
// import this from Route Handlers or server components, never the client.
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Plan } from "./entitlements";

// Async scrypt (non-blocking). scryptSync would block the event loop, so heavy
// concurrent logins could freeze the whole function — a DoS lever. The async
// form runs hashing off the main thread (libuv pool).
const scrypt = promisify(scryptCb) as (pw: string | Buffer, salt: Buffer, keylen: number) => Promise<Buffer>;

export type { Plan };

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const authEnabled = !!(KV_URL && KV_TOKEN);

export const SESSION_COOKIE = "fv_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Full record as stored in Redis (server-only — never sent to the client).
export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

// Safe shape returned to the browser (no hash, no internal billing ids).
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  plan: Plan;
};

export function toPublicUser(u: UserRecord): PublicUser {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt, plan: u.plan };
}

// ---- Upstash Redis REST (generic command, raw fetch) ----
// Exported so other server-only stores (account data, etc.) reuse one client.
export async function redis<T = unknown>(cmd: (string | number)[]): Promise<T> {
  if (!authEnabled) throw new Error("auth: Upstash Redis not configured");
  const r = await fetch(KV_URL as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: T; error?: string };
  if (!r.ok || j.error) throw new Error(`redis: ${j.error || r.status}`);
  return j.result as T;
}

// ---- password hashing (scrypt) ----
// Stored format: scrypt$<saltHex>$<hashHex>. timingSafeEqual on verify.
const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---- validation ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function validateName(name: string): string | null {
  if (name.trim().length < 1) return "Enter your name.";
  if (name.trim().length > 80) return "Name is too long.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 200) return "Password is too long.";
  return null;
}

export function validateSignup(email: string, password: string, name: string): string | null {
  if (!EMAIL_RE.test(normalizeEmail(email))) return "Enter a valid email address.";
  return validatePassword(password) || validateName(name);
}

// ---- user store ----
export async function getUserById(id: string): Promise<UserRecord | null> {
  const raw = await redis<string | null>(["GET", `user:${id}`]);
  return raw ? (JSON.parse(raw) as UserRecord) : null;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const id = await redis<string | null>(["GET", `email:${normalizeEmail(email)}`]);
  return id ? getUserById(id) : null;
}

// Creates a user, enforcing email uniqueness atomically via SET NX on the
// email→id index. Returns { user } or { error } for the taken case.
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: UserRecord } | { error: string }> {
  const e = normalizeEmail(email);
  const id = randomUUID();
  // Claim the email first; null result = key already existed.
  const claimed = await redis<string | null>(["SET", `email:${e}`, id, "NX"]);
  if (claimed === null) return { error: "An account with this email already exists." };

  const user: UserRecord = {
    id,
    email: e,
    name: name.trim(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    plan: "free",
  };
  await redis(["SET", `user:${id}`, JSON.stringify(user)]);
  return { user };
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<UserRecord, "id" | "email" | "createdAt">>
): Promise<UserRecord | null> {
  const user = await getUserById(id);
  if (!user) return null;
  const next = { ...user, ...patch };
  await redis(["SET", `user:${id}`, JSON.stringify(next)]);
  return next;
}

// ---- sessions (opaque server-side tokens) ----
// Each token maps to a userId (TTL-bounded). We also keep a per-user SET of the
// user's live tokens (sess:user:<id>) so all sessions can be revoked at once —
// e.g. on password change — for account-takeover recovery.
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await redis(["SET", `session:${token}`, userId, "EX", SESSION_TTL_SECONDS]);
  await redis(["SADD", `sess:user:${userId}`, token]);
  await redis(["EXPIRE", `sess:user:${userId}`, SESSION_TTL_SECONDS]);
  return token;
}

export async function getUserBySession(token: string | undefined): Promise<UserRecord | null> {
  if (!token) return null;
  const userId = await redis<string | null>(["GET", `session:${token}`]);
  return userId ? getUserById(userId) : null;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  const userId = await redis<string | null>(["GET", `session:${token}`]);
  await redis(["DEL", `session:${token}`]);
  if (userId) await redis(["SREM", `sess:user:${userId}`, token]);
}

// Revoke EVERY session for a user (kills all devices). Used after a password
// change so a stolen/old session can't outlive the credential it was born from.
export async function revokeUserSessions(userId: string): Promise<void> {
  const tokens = (await redis<string[] | null>(["SMEMBERS", `sess:user:${userId}`])) || [];
  for (const t of tokens) await redis(["DEL", `session:${t}`]);
  await redis(["DEL", `sess:user:${userId}`]);
}

// ---- brute-force throttle ----
// Increments rl:<bucket>:<ip>; sets a window on the first hit. Returns true
// when the caller is over the limit and should be blocked.
export async function rateLimited(bucket: string, ip: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = `rl:${bucket}:${ip}`;
  const n = await redis<number>(["INCR", key]);
  if (n === 1) await redis(["EXPIRE", key, windowSeconds]);
  return n > max;
}

// ---- per-ACCOUNT failure throttle ----
// Slows credential stuffing that rotates IPs by locking an account after too
// many recent failed logins. peek (no increment) → record on failure → clear
// on success, so legitimate logins are never penalised.
export async function failCount(bucket: string, key: string): Promise<number> {
  const n = await redis<string | number | null>(["GET", `rl:${bucket}:${key}`]);
  return Number(n ?? 0);
}
export async function recordFailure(bucket: string, key: string, windowSeconds: number): Promise<void> {
  const k = `rl:${bucket}:${key}`;
  const n = await redis<number>(["INCR", k]);
  if (n === 1) await redis(["EXPIRE", k, windowSeconds]);
}
export async function clearFailures(bucket: string, key: string): Promise<void> {
  await redis(["DEL", `rl:${bucket}:${key}`]);
}
