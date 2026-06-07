// One-off: run the cron's grading pass against production KV NOW (instead of
// waiting for the daily cron). Grades any logged pick whose fight has happened.
//   vercel env pull .env.vercel.tmp --environment=production --yes
//   node --loader ./scripts/resolve.mjs scripts/grade-now.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const txt = readFileSync(join(ROOT, ".env.vercel.tmp"), "utf8");
const get = (k) => { const m = txt.match(new RegExp("^" + k + "=(.*)$", "m")); if (!m) return null; let v = m[1].trim(); if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1); return v; };
process.env.KV_REST_API_URL = get("KV_REST_API_URL");
process.env.KV_REST_API_TOKEN = get("KV_REST_API_TOKEN");

const { gradeDue, getRecord } = await import("../src/lib/predictions.ts");
console.log("grading due fights…");
const r = await gradeDue(Date.now());
console.log("gradeDue:", r);
const rec = await getRecord();
console.log(`record: graded ${rec.graded}, pending ${rec.pending}, winners ${rec.correctWinners}/${rec.graded}`);
