// ============================================================
// FightVex — REAL historical bout collector (ESPN public MMA API)
//
// Crawls fighter eventlogs to assemble a leakage-free backtest set:
// every completed bout between two fighters whose FULL prior fight
// history we also captured, so each side's pre-fight stats can be
// rebuilt from only earlier fights. Writes backtest/history.json.
//
//   Phase A  seed eventlogs (roster + ranked + additions)
//   Phase B  1-hop expansion (their opponents) → universe U
//   Phase C  every unique competition once → date, winner, end
//            round + clock (finish vs decision), both stat lines
//
// THROTTLE-PROOF: every eventlog and competition is cached to
// backtest/cache/. Re-running skips everything already fetched, so a
// kill / 403 storm / timeout never loses work — just run it again and
// it resumes until the cache is complete. Politely paced + backoff.
//
// Run:   node scripts/fetch-history.mjs           (full 1-hop)
//        LIGHT=1 node scripts/fetch-history.mjs   (seed only, fast)
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "backtest");
const CACHE_DIR = join(OUT_DIR, "cache");
const OUT = join(OUT_DIR, "history.json");
const EVLOG_CACHE = join(CACHE_DIR, "eventlogs.json");
const COMP_CACHE = join(CACHE_DIR, "comps.json");
const CORE = "https://sports.core.api.espn.com/v2/sports/mma";
const UA = { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FightVex/1.0" } };
const CONC = Number(process.env.CONC) || 8;   // polite sustained rate beats bursts
const DELAY = Number(process.env.DELAY) || 60; // ms between a worker's requests

const idFrom = (ref) => (ref || "").match(/(\d+)(?:\?|$)/)?.[1] ?? null;
const compIdFrom = (ref) => (ref || "").match(/competitions\/(\d+)/)?.[1] ?? null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const loadJson = (p, def) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return def; } };

// ---- persistent caches (resume across runs) ----
let evlogCache = {}; // fighterId -> [compRef] | null(=no eventlog)
let compCache = {};  // compId -> boutRecord | 0(=failed/skip)
let dirtyEv = 0, dirtyComp = 0;
function flush(force = false) {
  if (force || dirtyEv) { writeFileSync(EVLOG_CACHE, JSON.stringify(evlogCache)); dirtyEv = 0; }
  if (force || dirtyComp) { writeFileSync(COMP_CACHE, JSON.stringify(compCache)); dirtyComp = 0; }
}

async function j(url, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, UA);
      if (r.status === 403 || r.status === 429) { await sleep(800 * 2 ** i + Math.random() * 400); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
  throw new Error("retries exhausted");
}

async function pool(items, fn, label) {
  const out = new Array(items.length);
  let i = 0, done = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); } catch { out[idx] = null; }
      if (++done % 100 === 0) { process.stdout.write(`\r  ${label} ${done}/${items.length}   `); flush(); }
      if (DELAY) await sleep(DELAY);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, items.length) }, worker));
  process.stdout.write(`\r  ${label} ${items.length}/${items.length}   \n`);
  flush(true);
  return out;
}

function num(stats, name) { const s = (stats || []).find((x) => x.name === name); if (!s) return 0; const v = parseFloat(s.value); return Number.isFinite(v) ? v : 0; }
function ctrlSec(stats) { const s = (stats || []).find((x) => x.name === "timeInControl"); const v = s?.displayValue; if (typeof v === "string" && v.includes(":")) { const [m, ss] = v.split(":"); return (+m) * 60 + (+ss); } return 0; }

function seedIds() {
  const ids = new Set();
  for (const file of ["src/lib/data/espn.generated.ts", "src/lib/data/rankings.override.ts"]) {
    const txt = readFileSync(join(ROOT, file), "utf8");
    for (const m of txt.matchAll(/"id":\s*"(\d+)"/g)) ids.add(m[1]);
  }
  return [...ids];
}

// cached eventlog → [compRef]
async function eventlog(id) {
  if (id in evlogCache) return evlogCache[id];
  let refs = null;
  try {
    const log = await j(`${CORE}/athletes/${id}/eventlog`);
    refs = (log.events?.items || []).filter((it) => it.played && it.competition?.$ref).map((it) => it.competition.$ref);
  } catch { refs = null; }
  evlogCache[id] = refs; dirtyEv++;
  return refs;
}

// cached competition → normalized bout record (both stat lines)
async function competition(ref) {
  const cid = compIdFrom(ref);
  if (cid in compCache) return compCache[cid] || null;
  let rec = 0;
  try {
    const comp = await j(ref);
    const cs = (comp.competitors || []).filter((c) => c.id);
    if (cs.length === 2) {
      const maxRounds = comp.format?.regulation?.periods || 3;
      let endRound = maxRounds, clock = 0;
      try { const st = comp.status?.$ref ? await j(comp.status.$ref) : comp.status; endRound = st?.period || maxRounds; clock = typeof st?.clock === "number" ? st.clock : 0; } catch { /* defaults */ }
      const finished = endRound < maxRounds || (clock > 0 && clock < 295);
      const side = async (c) => {
        let stats = [];
        try { if (c.statistics?.$ref) { const st = await j(c.statistics.$ref); stats = st.splits?.categories?.[0]?.stats || []; } } catch { /* none */ }
        return { id: String(c.id), winner: !!c.winner, order: c.order ?? 9, sigL: num(stats, "sigStrikesLanded"), sigA: num(stats, "sigStrikesAttempted"), tdL: num(stats, "takedownsLanded"), tdA: num(stats, "takedownsAttempted"), kd: num(stats, "knockDowns"), sub: num(stats, "submissions"), ctrl: ctrlSec(stats), hasStats: stats.length > 0 };
      };
      const [s0, s1] = await Promise.all([side(cs[0]), side(cs[1])]);
      rec = { compId: cid, date: comp.date, maxRounds, endRound, clock, finished, sides: [s0, s1] };
    }
  } catch { rec = 0; }
  compCache[cid] = rec; dirtyComp++;
  return rec || null;
}

async function main() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  evlogCache = loadJson(EVLOG_CACHE, {});
  compCache = loadJson(COMP_CACHE, {});
  const seed = seedIds();
  console.log(`Seed fighters: ${seed.length}  ·  cache: ${Object.keys(evlogCache).length} eventlogs, ${Object.keys(compCache).length} comps`);

  console.log("Phase A — seed eventlogs…");
  const seedLogs = await pool(seed, eventlog, "A");
  const compRefs = new Map(); // compId -> ref
  for (const refs of seedLogs) if (refs) for (const r of refs) compRefs.set(compIdFrom(r), r);
  console.log(`  unique competitions from seed: ${compRefs.size}`);

  console.log("Phase C(1) — seed competitions…");
  await pool([...compRefs.values()], competition, "C1");

  let universe = new Set(seed);
  const opponents = new Set();
  for (const cid of compRefs.keys()) { const c = compCache[cid]; if (c) for (const s of c.sides) if (!universe.has(s.id)) opponents.add(s.id); }
  console.log(`  opponents discovered: ${opponents.size}`);
  for (const id of opponents) universe.add(id);

  if (!process.env.LIGHT) {
    console.log("Phase B — opponent eventlogs…");
    const oppLogs = await pool([...opponents], eventlog, "B");
    for (const refs of oppLogs) if (refs) for (const r of refs) compRefs.set(compIdFrom(r), r);
    console.log(`  total unique competitions: ${compRefs.size}`);

    console.log("Phase C(2) — all competitions (cached skipped)…");
    await pool([...compRefs.values()], competition, "C2");
  }

  // EXPAND: 2nd hop — crawl eventlogs for every fighter that appears in a cached
  // comp but whose own history we haven't pulled, then their new comps. Grows
  // the set of fighters with FULL histories → many more reconstructable bouts.
  if (process.env.EXPAND) {
    const inComps = new Set();
    for (const c of Object.values(compCache)) if (c) for (const s of c.sides) inComps.add(s.id);
    const need = [...inComps].filter((id) => !(id in evlogCache));
    console.log(`Phase D — 2nd-hop eventlogs for ${need.length} fighters…`);
    const logs2 = await pool(need, eventlog, "D");
    for (const refs of logs2) if (refs) for (const r of refs) compRefs.set(compIdFrom(r), r);
    console.log(`  total unique competitions: ${compRefs.size}`);
    console.log("Phase E — new competitions (cached skipped)…");
    await pool([...compRefs.values()], competition, "E");
    for (const id of need) universe.add(id);
  }

  // Universe = every fighter whose FULL history we crawled (non-null eventlog),
  // so each side's pre-fight stats can be rebuilt without survivorship bias.
  const full = new Set(Object.entries(evlogCache).filter(([, v]) => v).map(([k]) => k));
  // assemble: bouts where both fighters have full histories + stats + decisive
  const all = Object.values(compCache).filter((c) => c && c.date && c.sides.every((s) => s.hasStats));
  const bouts = all.filter((c) => c.sides.every((s) => full.has(s.id)) && c.sides.some((s) => s.winner));
  universe = full;
  bouts.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), universe: universe.size, bouts }, null, 0));
  flush(true);
  const cached = Object.values(compCache).filter((c) => c).length;
  console.log(`\nUniverse ${universe.size} fighters · ${cached} comps cached · ${bouts.length} backtestable bouts → ${OUT}`);
}

main().catch((e) => { console.error("FAILED:", e); flush(true); process.exit(1); });
