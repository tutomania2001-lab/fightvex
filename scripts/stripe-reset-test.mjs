// One-off: clear TEST-mode Stripe links after switching to LIVE keys. Any stored
// stripeCustomerId/subscriptionId was created in test mode and doesn't exist in
// live mode, which breaks the billing portal/checkout. We clear those links and
// reset the (phantom test) plan to free, so a fresh LIVE checkout creates a real
// customer. Accounts with no Stripe link are left untouched.
//   vercel env pull .env.vercel.tmp --environment=production --yes
//   node --loader ./scripts/resolve.mjs scripts/stripe-reset-test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const txt = readFileSync(join(ROOT, ".env.vercel.tmp"), "utf8");
const get = (k) => { const m = txt.match(new RegExp("^" + k + "=(.*)$", "m")); if (!m) return null; let v = m[1].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; };
process.env.KV_REST_API_URL = get("KV_REST_API_URL");
process.env.KV_REST_API_TOKEN = get("KV_REST_API_TOKEN");

const { redis } = await import("../src/lib/auth.ts");

let cursor = "0", scanned = 0, reset = 0;
do {
  const res = await redis(["SCAN", cursor, "MATCH", "user:*", "COUNT", "200"]);
  cursor = String(res?.[0] ?? "0");
  const keys = res?.[1] ?? [];
  for (const k of keys) {
    if (!/^user:[^:]+$/.test(k)) continue; // skip sess:user:* etc.
    scanned++;
    const raw = await redis(["GET", k]);
    if (!raw) continue;
    let u; try { u = JSON.parse(raw); } catch { continue; }
    if (u.stripeCustomerId || u.subscriptionId) {
      delete u.stripeCustomerId; delete u.subscriptionId; u.plan = "free";
      await redis(["SET", k, JSON.stringify(u)]);
      reset++;
      console.log(`  reset ${u.email || k} → free (cleared test Stripe link)`);
    }
  }
} while (cursor !== "0");
console.log(`\nScanned ${scanned} accounts · reset ${reset} stripe-linked (test) account(s) to a clean live slate.`);
