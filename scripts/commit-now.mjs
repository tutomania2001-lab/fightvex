// One-off: run the same pre-fight log + Bitcoin-commit the cron does, against the
// production KV (creds from .env.vercel.tmp). Use to anchor upcoming cards now
// instead of waiting for the next scheduled cron. Run:
//   vercel env pull .env.vercel.tmp --environment=production --yes
//   node --loader ./scripts/resolve.mjs scripts/commit-now.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const txt = readFileSync(join(ROOT, ".env.vercel.tmp"), "utf8");
const get = (k) => { const m = txt.match(new RegExp("^" + k + "=(.*)$", "m")); if (!m) return null; let v = m[1].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; };
process.env.KV_REST_API_URL = get("KV_REST_API_URL");
process.env.KV_REST_API_TOKEN = get("KV_REST_API_TOKEN");

const { logUpcoming } = await import("../src/lib/predictions.ts");
const { upgradeCommitments, getCommitments } = await import("../src/lib/commit.ts");

console.log("logging + committing upcoming cards (pre-fight)…");
const logged = await logUpcoming(Date.now());
console.log("logUpcoming:", logged);
const up = await upgradeCommitments();
console.log("upgrade (Bitcoin):", up);
const commits = await getCommitments();
console.log(`\n${commits.length} commitment(s):`);
for (const c of commits) console.log(`  ${c.eventName} · locked ${c.committedAt} · hash ${c.hash.slice(0, 16)}… · ${c.bitcoin ? `Bitcoin block #${c.bitcoin.height}` : "awaiting Bitcoin block"}`);
