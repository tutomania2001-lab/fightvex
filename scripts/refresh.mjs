// ============================================================
// FightVex — one-shot data + asset refresh.
//
// Regenerates the real event cards (ESPN) and then ALWAYS fetches
// the assets (ESPN headshot → ufc.com full body/torso) for every
// fighter on the new cards, so a freshly-added card fighter never
// renders the default silhouette. Run this whenever the cards roll:
//
//   npm run refresh
//
// Steps (each tolerant — a miss for one fighter never aborts):
//   1. node scripts/fetch-espn.mjs        (ESPN_FORCE=1 → fresh cards)
//   2. python scripts/fetch_headshots.py  (adds new headshots)
//   3. python scripts/fetch_bodies.py     (adds new full bodies/torsos)
//
// Python + Pillow are required locally (Vercel has neither, which is
// why assets are generated here and committed). If `python` isn't on
// PATH the script retries with `python3`.
// ============================================================
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const run = (cmd, args, env) => {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: join(here, ".."), stdio: "inherit", env: { ...process.env, ...env } });
  return r.status === 0 && !r.error;
};

// Find a working Python interpreter (python, then python3).
function python(scriptArgs) {
  for (const exe of ["python", "python3"]) {
    const probe = spawnSync(exe, ["--version"], { stdio: "ignore" });
    if (probe.status === 0) return run(exe, scriptArgs);
  }
  console.warn(`⚠ no python interpreter found — skipping ${scriptArgs.join(" ")} (assets not refreshed)`);
  return false;
}

console.log("FightVex refresh — regenerating cards + fetching new fighter assets…");

// 1. Cards (forced so it always picks up roster/schedule changes).
if (!run(process.execPath, ["scripts/fetch-espn.mjs"], { ESPN_FORCE: "1" })) {
  console.warn("⚠ ESPN card fetch failed — keeping existing data; still trying asset fetch.");
}

// 2 + 3. Assets for any new fighters (headshots, then full bodies/torsos).
python(["scripts/fetch_headshots.py"]);
python(["scripts/fetch_bodies.py"]);

console.log("\n✓ refresh complete. Review the diff, then build + deploy.");
