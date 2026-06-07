// ============================================================
// FightVex — LIVE odds time-series (server-only).
//
// Stores timestamped moneyline snapshots per bout in Vercel KV /
// Upstash Redis (via the REST API — no SDK dependency). The
// /api/cron/odds route fetches real UFC moneylines from The Odds
// API on a schedule and appends a snapshot; the betting page reads
// the series and the Line Movement Tracker plots it.
//
// Fully optional: if the env vars aren't set, everything falls back
// to the static seed (opening → current) in odds.generated.ts, so
// the site works unchanged until the feed is switched on.
//
// Required env (all free tiers):
//   KV_REST_API_URL, KV_REST_API_TOKEN   (Vercel KV / Upstash)
//   THE_ODDS_API_KEY                      (the-odds-api.com)
//   CRON_SECRET                           (protects the cron route)
// ============================================================
import { REAL_ODDS, ODDS_CAPTURED } from "./data/odds.generated";

export type Snap = { t: string; a: number; b: number };

// Accept either the legacy Vercel KV names or the Upstash integration names.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const kvEnabled = !!(KV_URL && KV_TOKEN);
export const oddsApiEnabled = !!process.env.THE_ODDS_API_KEY;

const seriesKey = (id: string) => `odds:series:${id}`;

// ---- Vercel KV / Upstash REST (raw fetch) ----
// `fresh` (cron append path) bypasses the cache; the page read path caches for
// 30 min so /betting can render as ISR instead of dynamically re-fetching KV on
// every navigation (which made the page slow to load).
async function kvGet(key: string, fresh = false): Promise<string | null> {
  if (!kvEnabled) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 1800 } }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { result: string | null };
    return j.result ?? null;
  } catch {
    return null;
  }
}
async function kvSet(key: string, value: string): Promise<boolean> {
  if (!kvEnabled) return false;
  try {
    const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      body: value,
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function getKvSnaps(id: string, fresh = false): Promise<Snap[]> {
  const raw = await kvGet(seriesKey(id), fresh);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Snap[]) : [];
  } catch {
    return [];
  }
}

// ---- public read: full series per bout = static seed + live snapshots ----
// Seed: opening line, then the captured current consensus. KV snapshots
// (chronological, deduped by timestamp) extend it live.
export function seedSeries(id: string): Snap[] {
  const ro = REAL_ODDS[id];
  if (!ro) return [];
  const out: Snap[] = [];
  if (ro.openA != null && ro.openB != null) out.push({ t: "open", a: ro.openA, b: ro.openB });
  out.push({ t: ODDS_CAPTURED, a: ro.oddsA, b: ro.oddsB });
  return out;
}

export async function getSeries(id: string): Promise<Snap[]> {
  const seed = seedSeries(id);
  const live = await getKvSnaps(id);
  if (!live.length) return seed;
  // drop any live snapshot at/before the captured seed timestamp, then append.
  const fresh = live.filter((s) => s.t > ODDS_CAPTURED);
  return [...seed, ...fresh];
}

export async function getSeriesMap(ids: string[]): Promise<Record<string, Snap[]>> {
  const entries = await Promise.all(ids.map(async (id) => [id, await getSeries(id)] as const));
  return Object.fromEntries(entries);
}

// ---- The Odds API fetch + match (used by the cron route) ----
type ApiEvent = {
  home_team?: string;
  away_team?: string;
  bookmakers?: { markets?: { key: string; outcomes?: { name: string; price: number }[] }[] }[];
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
const americanToDecimal = (a: number) => (a > 0 ? a / 100 + 1 : 100 / -a + 1);
const decimalToAmerican = (d: number) => (d >= 2 ? Math.round((d - 1) * 100) : -Math.round(100 / (d - 1)));

export async function fetchTheOddsApi(): Promise<ApiEvent[]> {
  const key = process.env.THE_ODDS_API_KEY;
  if (!key) return [];
  const url = `https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds/?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Odds API ${r.status}`);
  return (await r.json()) as ApiEvent[];
}

// Consensus moneyline (decimal-averaged across books) per bout, oriented A/B.
export function consensusForBouts(
  events: ApiEvent[],
  bouts: { id: string; aName: string; bName: string }[]
): Record<string, { oddsA: number; oddsB: number }> {
  const out: Record<string, { oddsA: number; oddsB: number }> = {};
  for (const bout of bouts) {
    const na = norm(bout.aName);
    const nb = norm(bout.bName);
    const ev = events.find((e) => {
      const h = norm(e.home_team || "");
      const w = norm(e.away_team || "");
      return (h.includes(na) || na.includes(h) || h.includes(nb) || nb.includes(h)) &&
             (w.includes(na) || na.includes(w) || w.includes(nb) || nb.includes(w));
    });
    if (!ev) continue;
    const decA: number[] = [];
    const decB: number[] = [];
    for (const bk of ev.bookmakers || []) {
      const h2h = (bk.markets || []).find((m) => m.key === "h2h");
      for (const o of h2h?.outcomes || []) {
        const n = norm(o.name);
        const dec = americanToDecimal(o.price);
        if (n.includes(na) || na.includes(n)) decA.push(dec);
        else if (n.includes(nb) || nb.includes(n)) decB.push(dec);
      }
    }
    if (!decA.length || !decB.length) continue;
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    out[bout.id] = { oddsA: decimalToAmerican(avg(decA)), oddsB: decimalToAmerican(avg(decB)) };
  }
  return out;
}

// Append a snapshot for one bout (called by the cron route).
export async function appendSnapshot(id: string, snap: Snap): Promise<boolean> {
  const existing = await getKvSnaps(id, true); // cron must read the live value
  // dedupe same-day captures: replace if last snapshot shares the date prefix.
  const day = snap.t.slice(0, 10);
  const trimmed = existing.filter((s) => s.t.slice(0, 10) !== day);
  const next = [...trimmed, snap].slice(-60); // keep last ~60 points
  return kvSet(seriesKey(id), JSON.stringify(next));
}
