// One-off: re-evaluate ALL upcoming cards with the current model and re-anchor
// fresh Bitcoin timestamps. Clears only UN-graded (pending) picks + upcoming
// commitments — the graded track record (settled cards) is never touched — then
// re-logs and re-commits every upcoming bout. Pre-fight, so still honest.
//   vercel env pull .env.vercel.tmp --environment=production --yes
//   node --loader ./scripts/resolve.mjs scripts/repredict-now.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const txt = readFileSync(join(ROOT, ".env.vercel.tmp"), "utf8");
const get = (k) => { const m = txt.match(new RegExp("^" + k + "=(.*)$", "m")); if (!m) return null; let v = m[1].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; };
process.env.KV_REST_API_URL = get("KV_REST_API_URL");
process.env.KV_REST_API_TOKEN = get("KV_REST_API_TOKEN");

const { redis } = await import("../src/lib/auth.ts");
const { logUpcoming, getRecord } = await import("../src/lib/predictions.ts");
const { invalidateCommitment, upgradeCommitments, getCommitments } = await import("../src/lib/commit.ts");
const now = Date.now();

// 1) clear ungraded (pending) predictions — KEEP every graded one
const ids = (await redis(["SMEMBERS", "pred:index"])) ?? [];
let cleared = 0, keptGraded = 0;
for (const id of ids) {
  const raw = await redis(["GET", `pred:${id}`]);
  if (!raw) { await redis(["SREM", "pred:index", id]); continue; }
  const p = JSON.parse(raw);
  if (p.graded) { keptGraded++; continue; }
  await redis(["DEL", `pred:${id}`]); await redis(["SREM", "pred:index", id]); cleared++;
}
console.log(`cleared ${cleared} pending picks · kept ${keptGraded} graded (settled record preserved)`);

// 2) invalidate commitments for upcoming (future) events so they re-anchor fresh
for (const c of await getCommitments()) {
  if (new Date(c.eventDate).getTime() > now) { await invalidateCommitment(c.eventSlug); console.log("re-anchoring:", c.eventSlug); }
}

// 3) re-log + re-commit every upcoming bout with the current model
console.log("re-evaluating + committing upcoming cards…");
console.log("logUpcoming:", await logUpcoming(now));
console.log("upgrade (Bitcoin):", await upgradeCommitments());

// 4) report
const rec = await getRecord();
console.log(`record: graded ${rec.graded} · pending ${rec.pending}`);
for (const c of await getCommitments())
  console.log(`  ${c.eventName} ${new Date(c.eventDate).getTime() > now ? "(upcoming)" : "(settled)"} · ${c.bitcoin ? `Bitcoin #${c.bitcoin.height}` : "awaiting block"} · locked ${c.committedAt}`);
