// ============================================================
// FightVex — live ESPN data (server-side, cached).
//
// Real fight history + news pulled on demand from the ESPN public
// MMA API. Used by the /api/espn/* route handlers. NOTHING here is
// fabricated: if ESPN lacks a field we return null/undefined and
// the UI shows "N/A" or an empty state. Results are cached via the
// fetch `revalidate` window so a fighter is only re-pulled
// periodically.
// ============================================================
import { getFighterById } from "./data/fighters";

const CORE = "https://sports.core.api.espn.com/v2/sports/mma";
const SITE = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc";
const UA = { "user-agent": "FightVex/1.0" };
const TTL = 21600; // 6h

export interface CareerFight {
  date: string | null;
  opponent: string;       // real name or "N/A"
  opponentSlug?: string;  // set only if the opponent is in our roster
  win: boolean | null;    // null = ESPN didn't mark a winner
  division?: string;
  round?: number;         // round the bout ended (status.period)
  // How it ended, from REAL ESPN data only: "Decision" when official judge
  // scorecards exist, otherwise "Finish · Rd N" (ESPN does not expose the
  // KO/TKO-vs-Submission distinction, so we never claim it). "N/A" if unknown.
  method: string;
}

export interface NewsItem {
  headline: string;
  description?: string;
  published?: string;
  link?: string;
  image?: string;
}

async function ej(url: string, revalidate = TTL): Promise<any> {
  const r = await fetch(url, { headers: UA, next: { revalidate } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// ---- Scoped exception: precise finish method from a trusted web source ----
// ESPN does not expose KO/TKO vs Submission. Wikipedia's community-maintained
// "Mixed martial arts record" tables list the exact method per bout. We read
// that table and match it to each REAL ESPN fight by opponent + year; if there
// is no confident match we fall back to the ESPN-derived Decision/Finish label.
const WIKI_UA = "FightVexBot/1.0 (https://fightvex.com; contact tutomania2001@gmail.com)";

interface WikiRow { opp: string; year?: number; method: string }

function cleanWiki(s: string): string {
  return s
    .replace(/\{\{[^{}]*\}\}/g, "")                       // drop templates
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")          // [[a|b]] -> b
    .replace(/\[\[([^\]]*)\]\]/g, "$1")                   // [[a]] -> a
    .replace(/align=center\|/g, "")
    .replace(/'''?/g, "")
    .trim();
}

function parseRecord(wt: string): WikiRow[] {
  const start = wt.search(/\{\{MMA record start\}\}/i);
  if (start === -1) return [];
  const rows = wt.slice(start).split(/\n\|-/);
  const out: WikiRow[] = [];
  for (const row of rows) {
    const cells = row.split(/\n\|/).map((c) => c.trim()).filter((c) => c.length);
    if (cells.length < 6) continue;
    if (!/^(\{\{[^}]*\}\})?\s*(Win|Loss|Draw|NC)/i.test(cells[0])) continue;
    // cell order: Result, Record, Opponent, Method, Event, Date, Round, Time, ...
    const opp = cleanWiki(cells[2]);
    const method = cleanWiki(cells[3]);
    const ym = cells[5]?.match(/(\d{4})/) || cells[4]?.match(/(\d{4})/);
    if (opp && method) out.push({ opp, year: ym ? Number(ym[1]) : undefined, method });
  }
  return out;
}

async function wikiWikitext(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
  try {
    const r = await fetch(url, { headers: { "user-agent": WIKI_UA }, next: { revalidate: 604800 } }); // weekly
    if (!r.ok) return null;
    const j = await r.json();
    return j?.parse?.wikitext ?? null;
  } catch { return null; }
}

export async function getWikiMethods(name: string): Promise<WikiRow[]> {
  for (const title of [name, `${name} (fighter)`, `${name} (mixed martial artist)`]) {
    const wt = await wikiWikitext(title);
    if (wt && /\{\{MMA record start\}\}/i.test(wt)) {
      const rows = parseRecord(wt);
      if (rows.length) return rows;
    }
  }
  return [];
}

function matchWikiMethod(rows: WikiRow[], opponent: string, year?: number): string | null {
  if (!opponent || opponent === "N/A" || rows.length === 0) return null;
  const last = opponent.toLowerCase().split(/\s+/).pop();
  if (!last) return null;
  const hit = rows.find((r) => (year ? r.year === year : true) && r.opp.toLowerCase().includes(last));
  return hit?.method || null;
}

// small concurrency pool so we don't fan out 60 requests at once
async function pool<T, R>(items: T[], fn: (t: T) => Promise<R>, size = 6): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx]); } catch { out[idx] = null as unknown as R; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length || 1) }, worker));
  return out;
}

// ---- Real career history from the athlete eventLog ----
export async function getCareerHistory(athleteId: string): Promise<CareerFight[]> {
  const self = getFighterById(athleteId);
  // Pull the eventLog (ESPN) and the precise methods (Wikipedia) in parallel.
  const [log, wikiRows] = await Promise.all([
    ej(`${CORE}/athletes/${athleteId}/eventlog`).catch(() => null),
    self ? getWikiMethods(self.name) : Promise.resolve([] as WikiRow[]),
  ]);
  if (!log) return [];
  // ESPN returns the eventLog newest-first (upcoming bout at index 0); keep that
  // order and cap to the most recent fights to bound the request.
  const items: any[] = (log?.events?.items || []).filter((it: any) => it?.played && it?.competition?.$ref);
  const recent = items.slice(0, 18);

  const fights = await pool(recent, async (it): Promise<CareerFight | null> => {
    const comp = await ej(it.competition.$ref);
    const competitors: any[] = comp?.competitors || [];
    const me = competitors.find((c) => String(c.id) === String(athleteId));
    const opp = competitors.find((c) => String(c.id) !== String(athleteId));

    let opponent = "N/A";
    let opponentSlug: string | undefined;
    if (opp) {
      const local = opp.id ? getFighterById(String(opp.id)) : undefined;
      if (local) { opponent = local.name; opponentSlug = local.slug; }
      else if (opp.athlete?.$ref) {
        try { const oa = await ej(opp.athlete.$ref); if (oa?.displayName) opponent = oa.displayName; } catch { /* keep N/A */ }
      }
    }

    // round (status.period) and decision-vs-finish (official scorecards) in parallel
    const [round, hasCards] = await Promise.all([
      (async () => {
        try {
          const st = comp?.status?.$ref ? await ej(comp.status.$ref) : comp?.status;
          return typeof st?.period === "number" ? (st.period as number) : undefined;
        } catch { return undefined; }
      })(),
      (async () => {
        try {
          if (!me?.linescores?.$ref) return null; // unknown
          const ls = await ej(me.linescores.$ref);
          return Array.isArray(ls?.items?.[0]?.linescores) && ls.items[0].linescores.length > 0;
        } catch { return null; }
      })(),
    ]);

    // A bout that ends before the scheduled final round cannot be a decision —
    // that's a fact from ESPN's round + scheduled-rounds, not an inference.
    const maxRounds = comp?.format?.regulation?.periods;
    const finishedEarly = typeof maxRounds === "number" && typeof round === "number" && round < maxRounds;
    const espnMethod =
      hasCards === true ? "Decision"
      : (hasCards === false || finishedEarly) ? (round ? `Finish · Rd ${round}` : "Finish")
      : "N/A";
    // Scoped exception: prefer the precise, trusted Wikipedia method (KO/TKO/
    // Submission/Decision) when it confidently matches this fight; else ESPN.
    const year = comp?.date ? new Date(comp.date).getUTCFullYear() : undefined;
    const method = matchWikiMethod(wikiRows, opponent, year) || espnMethod;

    return {
      date: comp?.date ?? null,
      opponent,
      opponentSlug,
      win: typeof me?.winner === "boolean" ? me.winner : null,
      division: comp?.type?.text || undefined,
      round,
      method,
    };
  }, 8);

  return fights.filter((f): f is CareerFight => f !== null);
}

// ---- Real news (related intelligence) ----
function mapArticles(json: any): NewsItem[] {
  const arts: any[] = json?.articles || json?.headlines || [];
  return arts
    .map((a) => ({
      headline: a?.headline || a?.title || "",
      description: a?.description || a?.summary || undefined,
      published: a?.published || a?.lastModified || undefined,
      link: a?.links?.web?.href || a?.links?.mobile?.href || (Array.isArray(a?.links) ? a.links[0]?.href : undefined),
      image: a?.images?.[0]?.url || undefined,
    }))
    .filter((n) => n.headline);
}

// General UFC news (real ESPN articles). ESPN has no per-athlete MMA news feed,
// so fighter "related intelligence" = real UFC news filtered to articles that
// actually mention the fighter; empty when ESPN has nothing about them.
export async function getUfcNews(limit = 10): Promise<NewsItem[]> {
  try {
    const j = await ej(`${SITE}/news?limit=${limit}`);
    return mapArticles(j).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getAthleteNews(name: string, limit = 6): Promise<NewsItem[]> {
  const all = await getUfcNews(20);
  const terms = name.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const last = terms[terms.length - 1] || name.toLowerCase();
  const hit = all.filter((n) => {
    const hay = `${n.headline} ${n.description ?? ""}`.toLowerCase();
    return hay.includes(name.toLowerCase()) || hay.includes(last);
  });
  return hit.slice(0, limit);
}
