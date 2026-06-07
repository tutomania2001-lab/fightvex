// ============================================================
// FightVex — fighter data layer
//
// REAL identity, bio & records come from the ESPN public MMA API
// (see espn.generated.ts, refreshed by `npm run fetch:espn`).
// ESPN does not expose deep MMA analytics (its athlete
// /statistics endpoint 404s), so the granular metrics below
// (SLpM, TD%, control, cardio, durability …) are MODEL ESTIMATES
// derived deterministically from each fighter's real record and
// finish profile. They are transparent estimates, not official
// stats. 21+ · Not betting advice.
// ============================================================
import type { Fighter, FighterStats, FormEntry, RiskFlag, Stance, WeightClass } from "../types";
import { REAL_FIGHTERS, type RawFighter } from "./espn.generated";
import { DIVISION_RANKINGS, P4P_RANKINGS, ROSTER_ADDITIONS } from "./rankings.override";
import { REAL_AGG, type RealAgg } from "./stats.generated";
import { portraitFor } from "./portraits";
import { lastFightFor, sosFor } from "./form.generated";

// ---- deterministic seeded RNG (stable per fighter) ----
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

const KNOWN_CLASSES: WeightClass[] = [
  "Flyweight", "Bantamweight", "Featherweight", "Lightweight", "Welterweight",
  "Middleweight", "Light Heavyweight", "Heavyweight",
  "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
];
function normClass(wc: string): WeightClass {
  if (KNOWN_CLASSES.includes(wc as WeightClass)) return wc as WeightClass;
  if (/women.*fly/i.test(wc)) return "Women's Flyweight";
  if (/women.*feather/i.test(wc)) return "Women's Bantamweight";
  if (/heavy/i.test(wc) && /light/i.test(wc)) return "Light Heavyweight";
  if (/heavy/i.test(wc)) return "Heavyweight";
  return "Lightweight";
}

function normStance(s: string): Stance {
  if (/southpaw/i.test(s)) return "Southpaw";
  if (/switch/i.test(s)) return "Switch";
  return "Orthodox";
}

// ---- REAL metrics from aggregated ESPN per-fight statistics ----
// slpm/sapm/accuracy/defense/takedowns/subs/knockdowns/control are computed
// directly from official ESPN per-fight numbers. cardio & durability are
// derived indicators (deep-water minutes / strikes & knockdowns absorbed);
// finishRate is from the real record. This is what fixes the old "everyone
// maxed" problem — the inputs are now measured, not flat-estimated.
function statsFromAgg(f: RawFighter, a: RealAgg): FighterStats {
  const min = Math.max(8, a.minutes);
  const fights = Math.max(1, a.fights);
  const rate15 = (v: number) => (v / min) * 15;

  // Raw per-fight metrics straight from the ESPN aggregate.
  let slpm = clamp(a.sigL / min, 0, 12);
  let sapm = clamp(a.oSigL / min, 0, 12);
  let strAcc = clamp(a.sigA > 0 ? (a.sigL / a.sigA) * 100 : 45, 20, 80);
  let strDef = clamp(a.oSigA > 0 ? (1 - a.oSigL / a.oSigA) * 100 : 50, 20, 88);
  let tdAvg = clamp(rate15(a.tdL), 0, 10);
  let tdAcc = clamp(a.tdA > 0 ? (a.tdL / a.tdA) * 100 : 25, 0, 95);
  let tdDef = clamp(a.oTdA > 0 ? (1 - a.oTdL / a.oTdA) * 100 : 55, 0, 100);
  let subAvg = clamp(rate15(a.sub), 0, 6);
  let kdAvg = clamp(rate15(a.kd), 0, 4);
  let ctrl = clamp(rate15(a.ctrl), 0, 9);
  let oppKdAvg = rate15(a.oKd);

  // Bayesian shrinkage toward typical UFC values. Per-fight rates from a small
  // sample (few cage minutes) are unreliable — a fighter who scored one quick
  // KO can show "elite" strike/power rates. Shrinking toward the mean by how
  // much cage time we actually have keeps a 2-3-fight prospect from looking like
  // a world-beater, while veterans keep their real numbers. w → 1 with more min.
  const w = clamp(min / (min + 28), 0.28, 0.93);
  const sh = (v: number, prior: number) => v * w + prior * (1 - w);
  slpm = sh(slpm, 3.4); sapm = sh(sapm, 3.4);
  strAcc = sh(strAcc, 45); strDef = sh(strDef, 53);
  tdAvg = sh(tdAvg, 1.2); tdAcc = sh(tdAcc, 36); tdDef = sh(tdDef, 60);
  subAvg = sh(subAvg, 0.45); kdAvg = sh(kdAvg, 0.4); ctrl = sh(ctrl, 1.6);
  oppKdAvg = sh(oppKdAvg, 0.35);

  const durability = clamp(100 - sapm * 6 - oppKdAvg * 16, 35, 98);
  const avgFightMin = min / fights;                     // proven deep-water time
  const cardio = clamp(40 + avgFightMin * 2.4 + Math.min(slpm, 6) * 1.2, 40, 99);
  // Finish rate from the real record, shrunk for fighters with few career wins.
  const rawFin = (f.record.ko + f.record.sub) / Math.max(1, f.record.wins) * 100;
  const wFin = f.record.wins / (f.record.wins + 5);
  const finishRate = clamp(rawFin * wFin + 50 * (1 - wFin), 0, 100);

  return {
    slpm: r1(slpm), strAcc: Math.round(strAcc), sapm: r1(sapm), strDef: Math.round(strDef),
    tdAvg: r1(tdAvg), tdAcc: Math.round(tdAcc), tdDef: Math.round(tdDef), subAvg: r1(subAvg),
    ctrl: r1(ctrl), kdAvg: r1(kdAvg), cardio: Math.round(cardio), durability: Math.round(durability),
    finishRate: Math.round(finishRate),
  };
}

// ---- fallback estimate (only for fighters ESPN has no fight stats for) ----
function estimateStats(f: RawFighter, rng: () => number): FighterStats {
  const total = Math.max(1, f.record.wins + f.record.losses + f.record.draws);
  const winPct = f.record.wins / total;
  const koShare = f.record.wins ? f.record.ko / f.record.wins : 0.33;
  const subShare = f.record.wins ? f.record.sub / f.record.wins : 0.33;
  const finishRate = Math.round(clamp((f.record.ko + f.record.sub) / Math.max(1, f.record.wins) * 100, 20, 92));
  const jitter = (base: number, spread: number) => base + (rng() - 0.5) * spread;

  // striker bias (ko-heavy) vs grappler bias (sub-heavy)
  const striker = koShare;     // 0..1
  const grappler = subShare;   // 0..1

  const slpm = r1(clamp(jitter(3.4 + striker * 3.4, 1.0), 1.6, 7.2));
  const kdAvg = r1(clamp(jitter(0.3 + striker * 1.5, 0.4), 0.1, 2.1));
  const strAcc = Math.round(clamp(jitter(44 + striker * 10, 6), 36, 58));
  const strDef = Math.round(clamp(jitter(52 + winPct * 14, 8), 42, 70));
  const sapm = r1(clamp(jitter(3.4 - winPct * 1.2, 0.8), 2.0, 4.6));

  const tdAvg = r1(clamp(jitter(0.6 + grappler * 4.6, 0.8), 0.1, 6.0));
  const tdAcc = Math.round(clamp(jitter(38 + grappler * 12, 8), 30, 58));
  const tdDef = Math.round(clamp(jitter(56 + winPct * 16, 10), 44, 82));
  const subAvg = r1(clamp(jitter(0.4 + grappler * 2.8, 0.5), 0.1, 3.2));
  const ctrl = r1(clamp(jitter(0.6 + grappler * 2.8, 0.7), 0.2, 4.0));

  const cardio = Math.round(clamp(jitter(54 + winPct * 22, 10), 45, 90));
  const durability = Math.round(clamp(jitter(66 + winPct * 14 - koShare * 6, 8), 50, 88));

  return { slpm, strAcc, sapm, strDef, tdAvg, tdAcc, tdDef, subAvg, ctrl, kdAvg, cardio, durability, finishRate };
}

const STRIKER_STR = ["One-shot power", "Volume striking", "Counter timing", "Distance management", "Combination boxing", "Low-kick game"];
const GRAPPLER_STR = ["Chain wrestling", "Top control", "Submission entries", "Scrambles", "Back-take threat", "Guard play"];
const ALLROUND_STR = ["Fight IQ", "Championship cardio", "Well-rounded everywhere", "Pace & pressure", "Cage control", "Adaptability"];
const STRIKER_WK = ["Takedown defense", "Grappling off the back", "Chin durability under fire"];
const GRAPPLER_WK = ["Striking output on the feet", "Susceptible to long-range volume", "Power deficit"];
const GEN_WK = ["Slow starts", "Late-round dips", "Inconsistent output"];

function pick<T>(arr: T[], rng: () => number, n: number): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
}

function styleLabel(koShare: number, subShare: number): "striker" | "grappler" | "all-round" {
  if (koShare >= 0.5 && koShare >= subShare) return "striker";
  if (subShare >= 0.45) return "grappler";
  return "all-round";
}

function buildForm(f: RawFighter, rng: () => number): FormEntry[] {
  // synthesize a plausible recent-5 from the real W/L totals (model layer)
  const results: ("W" | "L")[] = [];
  let w = f.record.wins, l = f.record.losses;
  for (let i = 0; i < 5; i++) {
    const takeWin = w > 0 && (l === 0 || rng() < w / (w + l));
    if (takeWin) { results.push("W"); w--; } else if (l > 0) { results.push("L"); l--; } else { results.push("W"); }
  }
  const koShare = f.record.wins ? f.record.ko / f.record.wins : 0.33;
  const subShare = f.record.wins ? f.record.sub / f.record.wins : 0.33;
  const methods = (win: boolean) => {
    if (!win) return rng() < 0.5 ? "DEC" : rng() < koShare ? "KO" : "SUB";
    const x = rng();
    return x < koShare ? "TKO" : x < koShare + subShare ? "SUB" : "DEC";
  };
  let y = 2025, mo = 11;
  return results.map((res) => {
    mo -= 3 + Math.floor(rng() * 3);
    while (mo <= 0) { mo += 12; y--; }
    const round = res === "W" ? 1 + Math.floor(rng() * 3) : 3;
    return {
      opponent: "—",
      result: res,
      method: methods(res === "W"),
      round,
      date: `${y}-${String(mo).padStart(2, "0")}`,
      rating: res === "W" ? 78 + Math.floor(rng() * 16) : 55 + Math.floor(rng() * 12),
    };
  });
}

function buildRiskFlags(f: RawFighter, layoffMonths: number, rng: () => number): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (layoffMonths >= 9) {
    flags.push({
      type: "layoff", label: `${layoffMonths}-month layoff`,
      severity: layoffMonths >= 14 ? "high" : "med",
      source: "ESPN event feed", confidence: "High", updated: "this week",
    });
  }
  if (f.age >= 36) {
    flags.push({
      type: "age", label: `Age ${f.age} — durability watch`,
      severity: "med", source: "Public record", confidence: "Medium", updated: "this week",
    });
  }
  if (f.record.losses >= 2 && f.record.ko / Math.max(1, f.record.wins) > 0.55) {
    flags.push({
      type: "durability", label: "Finish-or-be-finished profile",
      severity: "med", source: "Public record", confidence: "Medium", updated: "this week",
    });
  }
  return flags;
}

function enrich(f: RawFighter): Fighter {
  const rng = makeRng(seedFrom(f.id));
  // Real ESPN per-fight stats when available; fallback estimate otherwise.
  const agg = REAL_AGG[f.id];
  const stats = agg ? statsFromAgg(f, agg) : estimateStats(f, rng);
  const koShare = f.record.wins ? f.record.ko / f.record.wins : 0.33;
  const subShare = f.record.wins ? f.record.sub / f.record.wins : 0.33;
  const style = styleLabel(koShare, subShare);
  const total = f.record.wins + f.record.losses + f.record.draws;

  const strengths =
    style === "striker" ? pick(STRIKER_STR, rng, 3)
    : style === "grappler" ? pick(GRAPPLER_STR, rng, 3)
    : pick(ALLROUND_STR, rng, 3);
  const weaknesses =
    style === "striker" ? pick([...STRIKER_WK, ...GEN_WK], rng, 2)
    : style === "grappler" ? pick([...GRAPPLER_WK, ...GEN_WK], rng, 2)
    : pick(GEN_WK, rng, 2);

  const styleSummary =
    style === "striker"
      ? `${f.name} is a finishing-minded striker (${f.record.ko} KO/TKO wins) who looks to end fights on the feet. Vex AI rates the power highly; the questions are takedown defense and output in deep water.`
      : style === "grappler"
      ? `${f.name} is a grappling-first fighter (${f.record.sub} submission wins) who chains level changes into control time and submission threats, and is most beatable when kept standing.`
      : `${f.name} is a well-rounded fighter who blends striking and grappling without a single dominant mode — a high-floor profile that wins rounds across phases.`;

  // REAL layoff: months since the fighter's most recent bout (from history.json
  // via form.generated). Replaces a seeded-random placeholder that was feeding a
  // real rating penalty as noise. The layoff penalty only bites past ~9 months,
  // so a missing date defaults to a neutral "recently active" value (3) rather
  // than risking a phantom penalty.
  const lastFight = lastFightFor(f.id);
  const layoffMonths = lastFight
    ? clamp(Math.round((Date.now() - new Date(lastFight).getTime()) / 2.628e9), 0, 60)
    : 3;
  // Competition (oppQuality): rank/champ/experience guess REFINED by real
  // strength-of-schedule (avg win% of recent opponents). Centered on the roster
  // mean SOS (~0.60) so it's an unbiased ±adjustment that only separates tougher
  // from softer schedules — it doesn't shift the overall distribution. Real data
  // replacing part of a heuristic; note Competition is structurally untestable in
  // the leakage-free backtest (historical rankings can't be reconstructed), so
  // this is an honesty/quality refinement, not a backtest-tuned weight.
  const sosAdj = (sosFor(f.id) - 0.6) * 30;
  const oppQuality = Math.round(clamp(58 + (f.ranking != null ? (15 - Math.min(15, f.ranking)) * 2 : 0) + (f.champion ? 18 : 0) + (total > 18 ? 6 : 0) + sosAdj, 55, 92));

  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    nickname: f.nickname,
    country: f.country,
    flag: f.flag,
    age: f.age || 30,
    heightCm: f.heightCm || 178,
    reachCm: f.reachCm || (f.heightCm ? f.heightCm + 5 : 183),
    stance: normStance(f.stance),
    weightClass: normClass(f.weightClass),
    gym: undefined,
    image: portraitFor(f.slug),
    ranking: f.ranking,
    champion: f.champion,
    title: f.title,
    record: f.record,
    stats,
    statsReal: !!agg,
    strengths,
    weaknesses,
    styleSummary,
    oppQuality,
    layoffMonths,
    form: buildForm(f, rng),
    riskFlags: buildRiskFlags(f, layoffMonths, rng),
  };
}

// Current UFC champions (2026). ESPN's MMA rankings are years out of date for
// title holders, so we override them from Wikipedia "List of UFC champions"
// (current source). Update this map when a title changes.
const CURRENT_CHAMPIONS: Record<string, string> = {
  "Heavyweight": "Tom Aspinall",
  "Light Heavyweight": "Carlos Ulberg",
  "Middleweight": "Sean Strickland",
  "Welterweight": "Islam Makhachev",
  "Lightweight": "Ilia Topuria",
  "Featherweight": "Alexander Volkanovski",
  "Bantamweight": "Petr Yan",
  "Flyweight": "Joshua Van",
  "Women's Bantamweight": "Kayla Harrison",
  "Women's Flyweight": "Valentina Shevchenko",
  "Women's Strawweight": "Mackenzie Dern",
};

function applyCurrentChampions(list: Fighter[]) {
  const currentNames = new Set(Object.values(CURRENT_CHAMPIONS).map((n) => n.toLowerCase()));
  // Strip ESPN's stale champion designations.
  for (const f of list) {
    if (!currentNames.has(f.name.toLowerCase())) {
      if (f.title || f.champion) { f.title = undefined; f.champion = false; }
      if (f.ranking === 0) f.ranking = 1; // demote ex-champ to a top contender slot
    }
  }
  // Apply the real current champions (move them into their title division if ESPN had them elsewhere).
  for (const [division, name] of Object.entries(CURRENT_CHAMPIONS)) {
    const f = list.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (f) {
      f.weightClass = division as WeightClass;
      f.title = `UFC ${division} Champion`;
      f.champion = true;
      f.ranking = 0;
    }
  }
}

// ---- authoritative real rankings (UFC.com, June 2026) ----
// ESPN's feed is a stale snapshot with duplicate ranks, gaps and retired
// fighters. We (1) add the real contenders ESPN was missing and (2) overwrite
// every contender's rank from the official ordered list, so each division shows
// the champion (rank 0) followed by a clean, gap-free #1..#15 with no duplicates.
const nmeKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function mergeAdditions(): RawFighter[] {
  const seen = new Set(REAL_FIGHTERS.map((f) => nmeKey(f.name)));
  const extra = ROSTER_ADDITIONS.filter((f) => !seen.has(nmeKey(f.name)));
  return [...REAL_FIGHTERS, ...extra];
}

function applyRankings(list: Fighter[]) {
  const byKey = new Map<string, Fighter>();
  for (const f of list) {
    byKey.set(nmeKey(f.name), f);
    if (!byKey.has(nmeKey(f.slug))) byKey.set(nmeKey(f.slug), f);
  }
  // Drop ESPN's stale contender ranks; champions keep rank 0 (set elsewhere).
  for (const f of list) if (!f.champion) f.ranking = undefined;
  // The champion sits above the numbered ladder (shown as "Champion", no #).
  // Contenders take the official UFC contender numbers #1..#15.
  for (const [division, names] of Object.entries(DIVISION_RANKINGS)) {
    names.forEach((name, i) => {
      const f = byKey.get(nmeKey(name));
      if (!f) { console.warn(`[rankings] no fighter for "${name}" (${division})`); return; }
      if (f.champion) return;
      f.ranking = i + 1;
      f.weightClass = division as WeightClass;
    });
  }
}

export const FIGHTERS: Fighter[] = mergeAdditions().map(enrich);
applyCurrentChampions(FIGHTERS);
applyRankings(FIGHTERS);
const BY_ID = new Map(FIGHTERS.map((f) => [f.id, f]));
const BY_SLUG = new Map(FIGHTERS.map((f) => [f.slug, f]));
const BY_NAME = new Map(FIGHTERS.map((f) => [nmeKey(f.name), f]));

// ---- pound-for-pound (cross-divisional virtual "divisions") ----
// These aren't weight classes; they're flat #1..#15 ladders that pull real
// fighters from every division. We return copies with the P4P position as the
// rank and the divisional title stripped, so the list renders as a clean
// numbered ranking (the fighter's weight class still shows on the card).
export const P4P_DIVISIONS = Object.entries(P4P_RANKINGS).map(([wc, names]) => ({
  wc,
  count: names.filter((n) => BY_NAME.has(nmeKey(n))).length,
}));
export function isP4P(wc: string): boolean {
  return Object.prototype.hasOwnProperty.call(P4P_RANKINGS, wc);
}
export function poundForPound(wc: string): Fighter[] {
  const names = P4P_RANKINGS[wc] ?? [];
  const out: Fighter[] = [];
  names.forEach((name, i) => {
    const f = BY_NAME.get(nmeKey(name));
    if (f) out.push({ ...f, ranking: i + 1, champion: false, title: undefined });
  });
  return out;
}

// Fighters no longer active in the UFC: HIDDEN from the division roster
// (fightersByClass → the Fighters tab + /api/fighters/by-division), but KEPT in
// the DB — getFighter/getFighterById, detail pages, event cards and the
// simulator/compare tools still resolve them, so they can be re-enabled anytime.
const HIDDEN_FROM_ROSTER = new Set<string>([
  // Heavyweight
  "jairzinho-rozenstruik",
  // Light Heavyweight — keep only the active Tafa & Iwo among unranked
  "ryan-bader", "glover-teixeira", "corey-anderson", "thiago-santos",
  // Middleweight
  "gegard-mousasi", "douglas-lima", "derek-brunson",
  // Welterweight
  "colby-covington", "gilbert-burns", "jorge-masvidal", "michael-chiesa", "rory-macdonald", "rafael-dos-anjos",
  // Lightweight
  "gregor-gillespie", "paul-felder", "dustin-poirier",
  // Featherweight
  "chan-sung-jung", "john-yannis",
  // Flyweight
  "demetrious-johnson", "adriano-moraes",
]);

export function allFighters(): Fighter[] {
  return FIGHTERS;
}
export function getFighter(slug: string): Fighter | undefined {
  return BY_SLUG.get(slug);
}
export function getFighterById(id: string): Fighter | undefined {
  return BY_ID.get(id);
}
// The Fighters library shows only RANKED fighters — the champion (rank 0) and
// the official #1..#15 contenders. Unranked fighters are intentionally NOT
// listed (rankings churn constantly, so a fixed unranked list goes stale), but
// they stay in the DB — getFighter/getFighterById, detail pages, event cards
// and the simulator/compare still resolve them, so we already hold their data
// for the moment they're booked into a fight.
export function fightersByClass(): Record<string, Fighter[]> {
  const out: Record<string, Fighter[]> = {};
  for (const f of FIGHTERS) {
    if (f.ranking == null) continue;              // unranked — kept in DB, not in the library
    if (HIDDEN_FROM_ROSTER.has(f.slug)) continue; // not in UFC atm — hidden from divisions
    (out[f.weightClass] ??= []).push(f);
  }
  return out;
}
