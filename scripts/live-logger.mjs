// ============================================================
// FightVex — LIVE event logger. Polls ESPN during a card and, the moment each
// bout goes final, captures the real result (winner, method, round, time) and
// pairs it against our PRE-COMMITTED model pick — every record timestamped at
// the moment WE captured it. Produces an honest, time-stamped scorecard +
// per-bout data for post-event error analysis. Box-score detail is enriched
// afterward via fetch-history / the UFCStats crawler (not available strike-by-
// strike live). Run: node scripts/live-logger.mjs [espnEventId]
// ============================================================
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "backtest", "live"); mkdirSync(DIR, { recursive: true });
const UA = { headers: { "User-Agent": "Mozilla/5.0" } };
const EVENT_ID = process.argv[2] || null;
const SB = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard";
const PICKS_API = "https://fightvex.com/api/predictions/past";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = () => new Date().toISOString();
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
const last = (n) => norm((n || "").trim().split(/\s+/).slice(-1)[0]);
const method = (d) => /sub/i.test(d) ? "Submission" : /ko|tko/i.test(d) ? "KO/TKO" : /dec/i.test(d) ? "Decision" : /dq|disq/i.test(d) ? "DQ" : /draw|nc|no contest/i.test(d) ? "Draw/NC" : (d || "?");

// our committed picks for the card (from our own live API — the Bitcoin-locked set)
let picks = [];
try {
  const j = await (await fetch(PICKS_API)).json();
  for (const card of (j.upcoming || [])) for (const p of card.picks) picks.push({ ...p, eventName: card.eventName });
} catch (e) { console.log("warn: couldn't load committed picks:", e.message); }
const matchPick = (a, b) => picks.find((p) => { const set = new Set([last(p.aName), last(p.bName)]); return set.has(last(a)) && set.has(last(b)); });

let slug = "event", LOG;
const write = (rec) => appendFileSync(LOG, JSON.stringify(rec) + "\n");
const seen = {};
let maxBouts = 0; // guard against ESPN briefly returning a PARTIAL event list
const t0 = Date.now(), MAX_MS = 9 * 3600 * 1000;

async function tick() {
  const sb = await (await fetch(SB, UA)).json();
  const ev = EVENT_ID ? (sb.events || []).find((e) => e.id === EVENT_ID) : (sb.events || [])[0];
  if (!ev) { console.log(iso(), "no event on scoreboard"); return false; }
  if (!LOG) { slug = (ev.shortName || ev.name || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); LOG = join(DIR, `${slug}.jsonl`); write({ ts: iso(), kind: "start", event: ev.name, id: ev.id, date: ev.date, bouts: ev.competitions?.length, picksLoaded: picks.length }); console.log(`logging → ${LOG} (${ev.name}, ${ev.competitions?.length} bouts, ${picks.length} picks loaded)`); }

  maxBouts = Math.max(maxBouts, (ev.competitions || []).length);
  let inProgress = false, allDone = (ev.competitions || []).length >= maxBouts;
  for (const c of (ev.competitions || [])) {
    const [x, y] = c.competitors || [];
    if (!x || !y) continue;
    const an = x.athlete?.displayName, bn = y.athlete?.displayName;
    const st = c.status?.type?.state, detail = c.status?.type?.detail || "";
    const completed = !!c.status?.type?.completed;
    if (st === "in") inProgress = true;
    if (!completed) allDone = false;
    const prev = seen[c.id] || {};
    if (prev.state !== st) { write({ ts: iso(), kind: "status", bout: `${an} vs ${bn}`, state: st, detail }); console.log(`${iso()}  ${an} vs ${bn} → ${st} ${detail ? "(" + detail + ")" : ""}`); }
    if (completed && !prev.done) {
      const w = x.winner ? x : y.winner ? y : null;
      const pk = matchPick(an, bn);
      const actualWinner = w?.athlete?.displayName || null;
      const rec = {
        ts: iso(), kind: "result", boutId: pk?.boutId ?? null, a: an, b: bn,
        actualWinner, method: method(detail), round: c.status?.period ?? null, time: c.status?.displayClock ?? null, rawDetail: detail,
        pick: pk ? { name: pk.pickName, prob: pk.pickProb, predMethod: pk.predMethod } : null,
        correctWinner: pk && actualWinner ? last(pk.pickName) === last(actualWinner) : null,
        correctMethod: pk && actualWinner ? method(detail) === method(pk.predMethod || "") : null,
      };
      write(rec);
      console.log(`${iso()}  FINAL: ${an} vs ${bn} → ${actualWinner} (${rec.method} R${rec.round} ${rec.time}) | pick: ${rec.pick?.name ?? "—"} ${rec.correctWinner === true ? "✓" : rec.correctWinner === false ? "✗" : "?"}`);
    }
    seen[c.id] = { state: st, done: completed || prev.done };
  }
  return allDone;
}

console.log(`live-logger up @ ${iso()} — polling ESPN${EVENT_ID ? " event " + EVENT_ID : " (next event)"}`);
while (Date.now() - t0 < MAX_MS) {
  let done = false, anyIn = false;
  try { done = await tick(); anyIn = Object.values(seen).some((s) => s.state === "in"); }
  catch (e) { try { write({ ts: iso(), kind: "error", msg: e.message }); } catch {} console.log(iso(), "poll error:", e.message); }
  if (done) { write({ ts: iso(), kind: "complete" }); console.log(iso(), "ALL BOUTS FINAL — card complete."); break; }
  await sleep(anyIn ? 30000 : 120000);
}

// end-of-card scorecard
try {
  const lines = (await import("node:fs")).readFileSync(LOG, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const results = lines.filter((l) => l.kind === "result");
  const graded = results.filter((r) => r.correctWinner != null);
  const correct = graded.filter((r) => r.correctWinner).length;
  const sum = { event: slug, finals: results.length, gradedVsPick: graded.length, correctWinners: correct, accuracy: graded.length ? +(correct / graded.length).toFixed(3) : null, methodHits: graded.filter((r) => r.correctMethod).length };
  writeFileSync(join(DIR, `${slug}-scorecard.json`), JSON.stringify(sum, null, 2));
  console.log("SCORECARD:", JSON.stringify(sum));
} catch (e) { console.log("scorecard err:", e.message); }
