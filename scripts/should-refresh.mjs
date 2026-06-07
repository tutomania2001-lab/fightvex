// Gate for the auto-refresh workflow (.github/workflows/refresh.yml).
//
// The workflow ticks every 30 min, but a full ESPN refresh + production deploy
// is only worth doing at specific times. This script decides, writing
// `proceed=true|false` to $GITHUB_OUTPUT so later steps run conditionally.
//
// Proceed when:
//   (a) the run was triggered manually (workflow_dispatch), or
//   (b) an event started 3–9h ago — the card is finishing and real results are
//       landing on ESPN, so we refresh to capture them and roll to the next
//       card, or
//   (c) the daily heartbeat slot (12:00–12:29 UTC) — catches newly-added future
//       cards and odds even on quiet days.
// Otherwise skip, so the 30-min cadence stays effectively free.
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, "..", "src", "lib", "data", "espn.generated.ts");
const HOUR = 3.6e6;

function emit(proceed, reason) {
  console.log(`${proceed ? "PROCEED" : "SKIP"} — ${reason}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `proceed=${proceed}\n`);
  }
}

// (a) Manual runs always refresh.
if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
  emit(true, "manual dispatch");
  process.exit(0);
}

const now = Date.now();

// (c) Daily heartbeat.
const d = new Date(now);
if (d.getUTCHours() === 12 && d.getUTCMinutes() < 30) {
  emit(true, "daily heartbeat (12:00 UTC)");
  process.exit(0);
}

// (b) Post-event results window. Event dates in the data are UTC, formatted
// like "2026-06-15T00:00Z" (no seconds) — normalize before parsing.
let text = "";
try {
  text = readFileSync(FILE, "utf8");
} catch {
  emit(true, "could not read event data — refreshing to be safe");
  process.exit(0);
}

const starts = [...text.matchAll(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?Z/g)]
  .map((m) => Date.parse(`${m[1]}T${m[2]}:00Z`))
  .filter((t) => !Number.isNaN(t));

const recent = starts.find((t) => {
  const age = now - t;
  return age >= 3 * HOUR && age <= 9 * HOUR;
});

if (recent) {
  emit(true, `event started ${((now - recent) / HOUR).toFixed(1)}h ago — capturing results`);
} else {
  emit(false, "no event in the results window and not the daily slot");
}
