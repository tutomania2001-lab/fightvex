// ONE-OFF migration (run against production KV):
//   1) snapshot every pred:* record + index to backtest/_pred-backup.json
//   2) re-key predictions to `<eventSlug>::<boutId>` so positional bout ids can't
//      collide across the rolling schedule (the bug that let Topuria's b1..b7
//      overwrite the Muhammad card's picks)
//   3) reconstruct the overwritten Muhammad b1..b7 picks from the Bitcoin
//      commitment (the canonical pick-set) + the original event data (git), as
//      UNGRADED records — grade-now.mjs then grades them against ESPN.
//
//   node scripts/migrate-pred-keys.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const envv = (k) => { const t = readFileSync(join(ROOT, ".env.local"), "utf8"); const m = t.match(new RegExp("^" + k + '="?([^"\\n]+)"?', "m")); return m ? m[1] : null; };
const URL_ = envv("KV_REST_API_URL"), TOK = envv("KV_REST_API_TOKEN");
const redis = async (cmd) => { const r = await fetch(URL_, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) }); return (await r.json()).result; };
const SEP = "::";
const MUH = "ufc-fight-night-muhammad-vs-bonfim";

// ---- 1) snapshot ----
const index = (await redis(["SMEMBERS", "pred:index"])) ?? [];
const records = {};
for (const id of index) records[id] = await redis(["GET", `pred:${id}`]);
const backup = { at: new Date().toISOString(), index, records };
writeFileSync(join(ROOT, "backtest", "_pred-backup.json"), JSON.stringify(backup));
console.log(`snapshot: ${index.length} records -> backtest/_pred-backup.json`);

// ---- 2) re-key existing records to <slug>::<boutId> ----
let rekeyed = 0, already = 0;
for (const id of index) {
  if (id.includes(SEP)) { already++; continue; }
  const raw = records[id]; if (!raw) continue;
  const p = JSON.parse(raw);
  const newId = `${p.eventSlug}${SEP}${p.boutId || id}`;
  await redis(["SET", `pred:${newId}`, raw]);
  await redis(["SADD", "pred:index", newId]);
  await redis(["SREM", "pred:index", id]);
  await redis(["DEL", `pred:${id}`]);
  rekeyed++;
}
console.log(`re-keyed: ${rekeyed} (already composite: ${already})`);

// ---- 3) reconstruct overwritten Muhammad b1..b7 from commitment + git ----
const commitRaw = await redis(["GET", `commit:${MUH}`]);
if (!commitRaw) { console.log("no Muhammad commitment — skipping recovery"); process.exit(0); }
const commit = JSON.parse(commitRaw);
// canonical: FightVex|<version>|<slug>|b1=SIDE:PROBA:METHOD|...
const parts = commit.canonical.split("|");
const version = parts[1];
const picks = {};
for (const seg of parts.slice(3)) {
  const m = seg.match(/^([^=]+)=([AB]):([0-9.]+):(.+)$/);
  if (m) picks[m[1]] = { side: m[2], probA: Number(m[3]), method: m[4] };
}

// original Muhammad event + fighters from git (REAL_EVENTS/REAL_FIGHTERS are JSON)
const git = execSync("git show 722542f:src/lib/data/espn.generated.ts", { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString();
const grab = (name) => { const m = git.match(new RegExp(name + "[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);")); return m ? JSON.parse(m[1]) : null; };
const events = grab("REAL_EVENTS");
const fighters = grab("REAL_FIGHTERS");
const ev = events?.find((e) => e.slug === MUH);
const fById = new Map((fighters ?? []).map((f) => [f.id, f]));
if (!ev) { console.log("Muhammad event not found in git — skipping recovery"); process.exit(0); }

let recovered = 0;
for (const bout of ev.bouts) {
  const pid = `${MUH}${SEP}${bout.id}`;
  if (await redis(["GET", `pred:${pid}`])) continue;   // already present (b8..b12)
  const pk = picks[bout.id]; if (!pk) continue;
  const a = fById.get(bout.fighterA), b = fById.get(bout.fighterB);
  if (!a || !b) { console.log(`  skip ${bout.id}: fighter missing`); continue; }
  const pred = {
    boutId: bout.id, eventSlug: MUH, eventName: ev.name, date: ev.date,
    aId: a.id, aName: a.name, aSlug: a.slug, bId: b.id, bName: b.name, bSlug: b.slug,
    predWinnerSide: pk.side, predProbA: pk.probA, predMethod: pk.method,
    modelVersion: version,
    loggedAt: commit.committedAt,   // pre-fight (honest) — when the card was Bitcoin-locked
  };
  await redis(["SET", `pred:${pid}`, JSON.stringify(pred)]);
  await redis(["SADD", "pred:index", pid]);
  recovered++;
  console.log(`  recovered ${bout.id}: ${a.name} vs ${b.name} (pick ${pk.side})`);
}
console.log(`recovered ${recovered} Muhammad picks (ungraded — run grade-now next)`);
