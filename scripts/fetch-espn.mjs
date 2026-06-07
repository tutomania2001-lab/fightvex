// ============================================================
// FightVex — Real data generator (ESPN public MMA API)
//
// Pulls the next/most-recent UFC event, its full fight card, the
// real fighters on it (bio + record + finish breakdown), plus the
// live divisional rankings & champions. Writes a typed module to
// src/lib/data/espn.generated.ts which the data layer enriches
// with model-estimated analytics (ESPN does not expose deep MMA
// stats — its athlete /statistics endpoint returns 404).
//
// Source: site.api.espn.com + sports.core.api.espn.com (keyless,
// public, read-only). Run via `npm run fetch:espn` (also wired as
// predev / prebuild). Network failure leaves the existing file
// intact so the app still builds offline.
// ============================================================
import { writeFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "lib", "data", "espn.generated.ts");

const SITE = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc";
const CORE = "https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc";
const UA = { headers: { "user-agent": "Mozilla/5.0 FightVex/1.0" } };

// We only carry CURRENT UFC fighters. ESPN's rankings still list a few fighters
// who have left the promotion or retired (its data lags) — exclude them here by
// ESPN athlete id. Add ids as needed when ESPN is stale.
const INACTIVE = new Set([
  "3933168", // Francis Ngannou — left UFC
  "2516131", // Amanda Nunes — retired
]);

// Current champions ESPN's stale rankings omit — always include them in the roster.
const INCLUDE = new Set([
  "4010976", // Tom Aspinall — Heavyweight champ
  "4695736", // Carlos Ulberg — Light Heavyweight champ
  "3093653", // Sean Strickland — Middleweight champ
  "4350812", // Ilia Topuria — Lightweight champ
  "5120301", // Joshua Van — Flyweight champ
  "4332765", // Kayla Harrison — Women's Bantamweight champ
]);

// Skip the (heavier) refetch if the generated file is fresh, unless ESPN_FORCE=1.
const SKIP_HOURS = 6;

// ---- tiny resilient fetch + concurrency pool ----
async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, UA);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 400 * (i + 1)));
    }
  }
}
async function pool(items, fn, size = 6) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); }
      catch { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

const idFromRef = (ref) => (ref || "").match(/athletes\/(\d+)/)?.[1] ?? null;
const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")                  // drop apostrophes (O'Malley → omalley), don't dash them
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const inToCm = (v) => (v == null ? 0 : v > 120 ? Math.round(v) : Math.round(v * 2.54));

// ------------------------------------------------------------
// 1. Live rankings → id -> { rank, champion } map
// ------------------------------------------------------------
async function buildRankings() {
  const map = new Map();
  try {
    const index = await getJson(`${CORE}/rankings`);
    const divisions = await pool(index.items || [], (it) => getJson(it.$ref));
    for (const d of divisions) {
      if (!d || !Array.isArray(d.ranks)) continue;
      const name = d.shortName || d.name || "";
      if (/pound for pound/i.test(name)) continue;
      const isChampList = /champions/i.test(name) && d.ranks.length === 1;
      // e.g. "Welterweight Division Champions (Up to 170 pounds)" -> "UFC Welterweight Champion"
      const division = name.replace(/\s*Division (Champions|Rankings).*/i, "").trim();
      const title = isChampList && division ? `UFC ${division} Champion` : null;
      for (const rk of d.ranks) {
        const id = idFromRef(rk.athlete?.$ref);
        if (!id) continue;
        const prev = map.get(id) || {};
        if (isChampList) {
          map.set(id, { ...prev, champion: true, rank: 0, title });
        } else if (prev.rank == null || (rk.current ?? 99) < prev.rank) {
          map.set(id, { ...prev, rank: rk.current ?? prev.rank });
        }
      }
    }
  } catch (e) {
    console.warn("  rankings unavailable:", e.message);
  }
  return map;
}

// ------------------------------------------------------------
// 2. Athlete detail (bio + record + finish breakdown)
// ------------------------------------------------------------
async function fetchFighter(id, rankInfo) {
  const a = await getJson(`${CORE}/athletes/${id}`);
  if (!a || !a.displayName) return null;

  // real finish breakdown from the records ref
  let rec = { wins: 0, losses: 0, draws: 0, ko: 0, sub: 0, dec: 0 };
  try {
    const rr = a.records?.$ref ? await getJson(a.records.$ref) : null;
    const total = rr?.items?.find((it) => it.type === "total") || rr?.items?.[0];
    if (total) {
      const by = Object.fromEntries((total.stats || []).map((s) => [s.name, s.value]));
      rec.wins = by.wins ?? 0;
      rec.losses = by.losses ?? 0;
      rec.draws = by.draws ?? 0;
      rec.ko = by.tkos ?? 0;
      rec.sub = by.submissions ?? 0;
      rec.dec = Math.max(0, rec.wins - rec.ko - rec.sub);
    }
  } catch { /* fall through to summary parse below */ }
  if (!rec.wins && !rec.losses && a.records) { /* leave zeros */ }

  return {
    id: String(a.id),
    slug: slugify(a.displayName) || String(a.id),
    name: a.displayName,
    nickname: a.nickname && a.nickname.trim() ? a.nickname.trim() : undefined,
    country: a.citizenship || a.flag?.alt || "—",
    flag: a.flag?.href || "",
    age: a.age ?? 0,
    heightCm: inToCm(a.height),
    reachCm: inToCm(a.reach),
    stance: a.stance?.text || "Orthodox",
    weightClass: a.weightClass?.text || "",
    champion: rankInfo?.champion || undefined,
    title: rankInfo?.title || undefined,   // e.g. "UFC Welterweight Champion" (real, from ESPN rankings)
    ranking: rankInfo?.rank,
    record: rec,
  };
}

// ------------------------------------------------------------
// 3. Schedule → the next few UFC events (Saturday cards) + their cards
// ------------------------------------------------------------
const idFromEventRef = (ref) => (ref || "").match(/events\/(\d+)/)?.[1] || null;

// Keep real UFC main events (numbered cards + Fight Nights + specials like
// "UFC Freedom 250"); drop non-UFC junk such as "Dana White's Contender Series".
// Do NOT filter by weekday — most main cards are Saturday but specials (e.g. the
// White House card) are not, and a Saturday-only filter wrongly excludes them.
const isMainUfcEvent = (name) => /^UFC\b/i.test((name || "").trim());

// A future event taken from the scoreboard's calendar: real name + date, with
// the main-event bout inferred from the title ("UFC 325: Volkanovski vs. Lopes 2")
// matched to roster fighters so the banner can show their portraits. The full
// card fills in automatically once it becomes the soonest event on the scoreboard.
function buildLiteEvent(cal, idx, fighters) {
  let bouts = [];
  const after = cal.name.includes(":") ? cal.name.split(":").slice(1).join(":") : "";
  const parts = after.split(/\s+vs\.?\s+/i).map((s) => s.replace(/\s+\d+$/, "").trim()).filter(Boolean);
  if (parts.length === 2) {
    const find = (nm) => {
      const surname = nm.split(/\s+/).slice(-1)[0].toLowerCase();
      const cands = fighters.filter((f) => f.name.toLowerCase().includes(surname));
      return cands.find((f) => f.name.toLowerCase() === nm.toLowerCase()) || (cands.length === 1 ? cands[0] : null);
    };
    const fa = find(parts[0]);
    const fb = find(parts[1]);
    if (fa && fb && fa.id !== fb.id) {
      bouts = [{ id: `e${idx + 1}-b1`, fighterA: fa.id, fighterB: fb.id, weightClass: fa.weightClass || "Catchweight", rounds: 5, boutOrder: 1 }];
    }
  }
  return {
    id: String(cal.id),
    slug: slugify(cal.name) || String(cal.id),
    name: cal.name,
    org: "UFC",
    date: cal.date,
    venue: "TBA",
    city: "",
    country: "",
    broadcast: "UFC / ESPN",
    status: "upcoming",
    bouts,
  };
}

// Full fight card for a FUTURE event, pulled from the ESPN core API
// (`/events/{id}` carries every bout inline). Same shape/id scheme as
// buildEventObj so upcoming events get their real, complete cards — not just
// the inferred main event. competitors are ordered by ESPN's `order` (1 = first
// listed, e.g. the champion) → fighterA; bouts are reversed so the main event
// is bout 1. Fighters missing a bio (rare) are skipped.
function buildCoreEventObj(ev, venue, idx, haveId) {
  const comps = (ev.competitions || []).filter((c) => (c.competitors || []).length === 2);
  const ordered = comps.slice().reverse(); // ESPN lists prelims first → main last
  const prefix = idx === 0 ? "" : `e${idx + 1}-`;
  const bouts = [];
  ordered.forEach((c, i) => {
    const cs = c.competitors.slice().sort((a, b) => (a.order ?? 9) - (b.order ?? 9));
    const A = String(cs[0].id);
    const B = String(cs[1].id);
    if (!haveId.has(A) || !haveId.has(B)) return;
    bouts.push({
      id: `${prefix}b${i + 1}`,
      fighterA: A,
      fighterB: B,
      weightClass: c.type?.abbreviation || "Catchweight",
      rounds: c.format?.regulation?.periods === 5 ? 5 : 3,
      boutOrder: i + 1,
    });
  });
  return {
    id: String(ev.id),
    slug: slugify(ev.name) || String(ev.id),
    name: ev.name,
    org: "UFC",
    date: ev.date,
    venue: venue?.fullName || "TBA",
    city: venue?.address?.city || "",
    country: venue?.address?.country || venue?.address?.state || "",
    broadcast: "UFC / ESPN",
    status: "upcoming",
    bouts,
  };
}

// Fetch a future event's full card (+ venue) from the core API by id.
async function fetchCoreEvent(id) {
  const ev = await getJson(`${CORE}/events/${id}?lang=en&region=us`);
  let venue = null;
  try { if (ev.venues?.[0]?.$ref) venue = await getJson(ev.venues[0].$ref); } catch { /* venue optional */ }
  return { ev, venue };
}

// Build one event object (+ its bouts). Event 0 keeps plain bout ids (b1..) so
// the captured real-odds map still matches; later events get prefixed ids.
function buildEventObj(ev, idx, haveId) {
  const comps = (ev.competitions || []).filter((c) => c.competitors?.length === 2);
  const ordered = comps.slice().reverse(); // ESPN lists prelims first → main last
  const prefix = idx === 0 ? "" : `e${idx + 1}-`;
  const bouts = [];
  ordered.forEach((c, i) => {
    const A = String(c.competitors[0].id);
    const B = String(c.competitors[1].id);
    if (!haveId.has(A) || !haveId.has(B)) return;
    bouts.push({
      id: `${prefix}b${i + 1}`,
      fighterA: A,
      fighterB: B,
      weightClass: c.type?.abbreviation || "Catchweight",
      rounds: c.format?.regulation?.periods === 5 ? 5 : 3,
      boutOrder: i + 1,
    });
  });
  const venue = comps[0]?.venue;
  return {
    id: String(ev.id),
    slug: slugify(ev.name) || String(ev.id),
    name: ev.name,
    org: "UFC",
    date: ev.date,
    venue: venue?.fullName || "TBA",
    city: venue?.address?.city || "",
    country: venue?.address?.country || venue?.address?.state || "",
    broadcast: ev.competitions?.[0]?.broadcast || "UFC / ESPN",
    status: ev.status?.type?.state === "post" ? "completed" : ev.status?.type?.state === "in" ? "live" : "upcoming",
    bouts,
  };
}

async function main() {
  if (existsSync(OUT) && !process.env.ESPN_FORCE) {
    const ageH = (Date.now() - statSync(OUT).mtimeMs) / 3.6e6;
    if (ageH < SKIP_HOURS) {
      console.log(`espn.generated.ts is ${ageH.toFixed(1)}h old — skipping refresh (set ESPN_FORCE=1 to force).`);
      return;
    }
  }
  console.log("Fetching ESPN UFC data…");
  const [sb, ranks] = await Promise.all([getJson(`${SITE}/scoreboard`), buildRankings()]);

  // Current event (with its full inline card) from the scoreboard.
  const sbEvents = (sb.events || []).slice();
  const sbCurrent =
    sbEvents.filter((e) => e.status?.type?.state !== "post").sort((a, b) => new Date(a.date) - new Date(b.date))[0] ||
    sbEvents[0];

  // The next UFC main events from the official calendar, soonest first. We take
  // up to 4 and keep the most-recent just-finished card (12h grace) at index 0 so
  // the UPCOMING events keep a stable index (and thus stable bout ids that the
  // already-committed picks rely on) — the completed card is filtered from the UI.
  // Net: 3 upcoming cards are always populated as the schedule rolls forward.
  const cal = (sb.leagues?.[0]?.calendar || [])
    .map((c) => ({ name: c.label, date: c.startDate, id: idFromEventRef(c.event?.$ref) }))
    .filter((c) => c.id && c.date && new Date(c.date).getTime() > Date.now() - 12 * 3.6e6 && isMainUfcEvent(c.name))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);
  if (!cal.length && !sbCurrent) throw new Error("no upcoming UFC event found");

  // Pull the FULL card for every upcoming event from the core API. The soonest
  // event uses the scoreboard's inline card (preserves the real-odds bout ids);
  // the others get their complete cards here so they're no longer "lite".
  const coreEvents = await pool(cal, async (c) => {
    if (sbCurrent && c.id === String(sbCurrent.id)) return null; // scoreboard inline card
    try { return await fetchCoreEvent(c.id); } catch { return null; }
  });

  // Roster = EVERY fighter on EVERY upcoming card + each ranked fighter
  // (+ INCLUDE, − INACTIVE). Adding all card fighters is what lets the upcoming
  // events keep their full bouts (bouts with an unknown fighter are dropped).
  const cardIds = new Set();
  const addComps = (comps) => {
    for (const c of comps || [])
      if ((c.competitors || []).length === 2)
        for (const cmp of c.competitors) if (cmp.id) cardIds.add(String(cmp.id));
  };
  addComps(sbCurrent?.competitions);
  for (const ce of coreEvents) if (ce) addComps(ce.ev.competitions);
  const allIds = [...new Set([...cardIds, ...ranks.keys(), ...INCLUDE])].filter((id) => !INACTIVE.has(id));

  console.log(`  events:  ${(cal.length ? cal.map((c) => c.name) : [sbCurrent?.name]).join("  |  ")}`);
  console.log(`  roster ${allIds.length} fighters (card + ranked, minus inactive)`);

  const fetched = await pool(allIds, (id) => fetchFighter(id, ranks.get(id)));
  const fighters = fetched.filter(Boolean);
  const haveId = new Set(fighters.map((f) => f.id));

  // de-dup fighter slugs
  const seen = new Map();
  for (const f of fighters) {
    if (seen.has(f.slug)) f.slug = `${f.slug}-${f.id}`;
    seen.set(f.slug, true);
  }

  // Build from the calendar: the scoreboard's current event uses its inline
  // card; every other upcoming event uses its full core-API card. Lite event
  // (inferred main only) is just a last-resort fallback if the core fetch failed.
  const source = cal.length
    ? cal
    : sbCurrent
      ? [{ name: sbCurrent.name, date: sbCurrent.date, id: String(sbCurrent.id) }]
      : [];
  const events = source.map((c, idx) => {
    if (sbCurrent && c.id === String(sbCurrent.id)) return buildEventObj(sbCurrent, idx, haveId);
    const ce = coreEvents[idx];
    return ce ? buildCoreEventObj(ce.ev, ce.venue, idx, haveId) : buildLiteEvent(c, idx, fighters);
  });
  // de-dup event slugs
  const evSeen = new Map();
  for (const e of events) {
    if (evSeen.has(e.slug)) e.slug = `${e.slug}-${e.id}`;
    evSeen.set(e.slug, true);
  }

  const banner =
`// ============================================================
// AUTO-GENERATED by scripts/fetch-espn.mjs — DO NOT EDIT BY HAND.
// Real data from the ESPN public MMA API (keyless, read-only).
// Regenerate with: npm run fetch:espn
// Generated: ${new Date().toISOString()}
// ============================================================
/* eslint-disable */

export interface RawFighter {
  id: string; slug: string; name: string; nickname?: string;
  country: string; flag: string; age: number; heightCm: number;
  reachCm: number; stance: string; weightClass: string;
  champion?: boolean; title?: string; ranking?: number;
  record: { wins: number; losses: number; draws: number; ko: number; sub: number; dec: number };
}
export interface RawBout {
  id: string; fighterA: string; fighterB: string;
  weightClass: string; rounds: 3 | 5; boutOrder: number;
}
export interface RawEvent {
  id: string; slug: string; name: string; org: string; date: string;
  venue: string; city: string; country: string; broadcast: string;
  status: "upcoming" | "live" | "completed"; bouts: RawBout[];
}

export const GENERATED_AT = ${JSON.stringify(new Date().toISOString())};
`;

  const body =
`\nexport const REAL_FIGHTERS: RawFighter[] = ${JSON.stringify(fighters, null, 2)};\n\n` +
`export const REAL_EVENTS: RawEvent[] = ${JSON.stringify(events, null, 2)};\n\n` +
`export const REAL_EVENT: RawEvent = REAL_EVENTS[0];\n`;

  writeFileSync(OUT, banner + body, "utf8");
  const boutTotal = events.reduce((n, e) => n + e.bouts.length, 0);
  console.log(`  wrote ${fighters.length} fighters + ${events.length} events (${boutTotal} bouts) → ${OUT}`);
}

main().catch((e) => {
  console.warn("fetch-espn failed:", e.message);
  if (existsSync(OUT)) {
    console.warn("  keeping existing espn.generated.ts");
    process.exit(0); // don't break dev/build if offline
  }
  process.exit(1);
});
