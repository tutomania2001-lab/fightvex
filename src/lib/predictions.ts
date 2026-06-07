// ============================================================
// FightVex — Verified prediction record
//
// The ONLY honest way to claim accuracy: log every Vex AI pick
// BEFORE the fight, then grade it against the REAL result after.
// Nothing here is estimated — a prediction only counts toward the
// public record if it was logged before the fight date (so we can
// never "predict" a result we already know) AND the real outcome
// was fetched from the live results feed.
//
// Storage: the same Upstash Redis KV used by auth/odds (raw REST).
//   pred:index            -> SET of bout ids we've logged
//   pred:<boutId>         -> JSON Prediction (immutable once set; the
//                            outcome fields are appended only at grading)
// ============================================================
import { redis, authEnabled } from "./auth";
import { allEvents } from "./data/events";
import { getFighterById } from "./data/fighters";
import { simulate } from "./sim";
import { getCareerHistory, type CareerFight } from "./espn-live";
import { lastName, recordString } from "./format";
import { commitCard, canonicalCard, invalidateCommitment, type CommitPick } from "./commit";

const MODEL_VERSION = "vex-v3.1-shortnotice";
const INDEX_KEY = "pred:index";
const recKey = (boutId: string) => `pred:${boutId}`;

export const trackingEnabled = authEnabled;

async function loadAll(): Promise<Prediction[]> {
  if (!authEnabled) return [];
  let ids: string[] = [];
  try { ids = (await redis<string[]>(["SMEMBERS", INDEX_KEY])) ?? []; } catch { return []; }
  if (!ids.length) return [];
  const raws = (await redis<(string | null)[]>(["MGET", ...ids.map(recKey)])) ?? [];
  return raws.filter(Boolean).map((r) => JSON.parse(r as string) as Prediction);
}

export type MethodLabel = "KO/TKO" | "Submission" | "Decision";
export type ActualMethod = MethodLabel | "Finish"; // "Finish" = real result was a finish but the source didn't distinguish KO vs sub

export interface Prediction {
  boutId: string;
  eventSlug: string;
  eventName: string;
  date: string; // event/fight date (ISO)
  aId: string; aName: string; aSlug: string;
  bId: string; bName: string; bSlug: string;
  predWinnerSide: "A" | "B";
  predProbA: number; // model P(A wins), 0..1
  predMethod: MethodLabel;
  modelVersion: string;
  loggedAt: string; // when we logged it — MUST be before `date` to count
  // ---- appended at grading time ----
  graded?: boolean;
  gradedAt?: string;
  actualWinnerSide?: "A" | "B";
  actualMethod?: ActualMethod | null;
  correctWinner?: boolean;
  correctMethod?: boolean | null; // null = couldn't verify (e.g. generic finish)
}

function modalMethod(m: { ko: number; sub: number; dec: number }): MethodLabel {
  if (m.ko >= m.sub && m.ko >= m.dec) return "KO/TKO";
  if (m.sub >= m.dec) return "Submission";
  return "Decision";
}

// Map a real result's free-text method to a family. Returns null if unknown.
function methodFamily(m: string | null | undefined): ActualMethod | null {
  if (!m) return null;
  const s = m.toLowerCase();
  if (s.includes("decision")) return "Decision";
  if (s.includes("submission") || s.includes("choke") || s.includes("lock") || s.includes("-bar") || s.includes("armbar") || s.includes("triangle") || s.includes("guillotine") || s.includes("tap")) return "Submission";
  if (s.includes("tko") || /\bko\b/.test(s) || s.includes("knockout") || s.includes("punch") || s.includes("kick") || s.includes("elbow") || s.includes("knee")) return "KO/TKO";
  if (s.includes("finish")) return "Finish"; // ESPN generic "Finish · Rd N" — KO vs sub not exposed
  return null;
}

// Find the real scheduled bout (and its date/rounds) for two fighters, if any —
// order-independent. Used to attach a real fight + date to a user's saved pick.
export function findRealBout(aId: string, bId: string): { boutId: string; date: string; rounds: 3 | 5 } | null {
  for (const e of allEvents()) {
    for (const m of e.matchups) {
      if ((m.fighterA === aId && m.fighterB === bId) || (m.fighterA === bId && m.fighterB === aId)) {
        return { boutId: m.id, date: e.date, rounds: m.rounds };
      }
    }
  }
  return null;
}

// Fetch the REAL result of a bout from fighter A's career history (matched by
// opponent + date). Returns null if too soon, not found, or unresolved. Shared
// by both the global record and per-account grading so they stay consistent.
export async function fetchBoutResult(
  aId: string, bName: string, bSlug: string | undefined, fightDateISO: string, nowMs: number,
): Promise<{ winnerIsA: boolean; method: ActualMethod | null } | null> {
  if (new Date(fightDateISO).getTime() > nowMs - 6 * 3600_000) return null; // wait ~6h past start
  const hist = await getCareerHistory(aId).catch(() => [] as CareerFight[]);
  const t = new Date(fightDateISO).getTime();
  const wantLast = lastName(bName).toLowerCase();
  const f = hist.find((x) => {
    const oppMatch = (bSlug && x.opponentSlug === bSlug) || lastName(x.opponent).toLowerCase() === wantLast;
    if (!oppMatch) return false;
    if (!x.date) return true;
    return Math.abs(new Date(x.date).getTime() - t) < 12 * 24 * 3600_000;
  });
  if (!f || f.win === null) return null;
  return { winnerIsA: f.win, method: methodFamily(f.method) };
}

// ---- 1) Log predictions for upcoming bouts (pre-fight, immutable) ----
export async function logUpcoming(nowMs: number): Promise<{ logged: number; alreadyLogged: number; bouts: number }> {
  if (!authEnabled) return { logged: 0, alreadyLogged: 0, bouts: 0 };
  let logged = 0, alreadyLogged = 0, bouts = 0;
  const relogged = new Set<string>(); // events whose picks we re-logged (model upgrade)
  for (const e of allEvents()) {
    if (new Date(e.date).getTime() <= nowMs) continue; // only log fights that have NOT happened yet
    for (const m of e.matchups) {
      const a = getFighterById(m.fighterA);
      const b = getFighterById(m.fighterB);
      if (!a || !b) continue;
      bouts++;
      // Re-log only when the pick is missing OR was made by an OLDER model
      // version (still pre-fight, so it's honest) — that keeps the public picks
      // in sync with the live engine. A current-version pick is immutable.
      const raw = await redis<string | null>(["GET", recKey(m.id)]);
      if (raw) {
        try { if ((JSON.parse(raw) as Prediction).modelVersion === MODEL_VERSION) { alreadyLogged++; continue; } } catch { /* corrupt → re-log */ }
        relogged.add(e.slug);
      }
      // 50,000 runs — matches the on-site Simulator so the logged pick and a
      // user's own simulation converge to the same result (no contradictions).
      const sim = simulate(a, b, { rounds: m.rounds, runs: 50000, shortNoticeA: m.shortNoticeA, shortNoticeB: m.shortNoticeB });
      const side: "A" | "B" = sim.probA >= sim.probB ? "A" : "B";
      const pred: Prediction = {
        boutId: m.id, eventSlug: e.slug, eventName: e.name, date: e.date,
        aId: a.id, aName: a.name, aSlug: a.slug, bId: b.id, bName: b.name, bSlug: b.slug,
        predWinnerSide: side,
        predProbA: +sim.probA.toFixed(4),
        predMethod: modalMethod(side === "A" ? sim.methodA : sim.methodB),
        modelVersion: MODEL_VERSION,
        loggedAt: new Date(nowMs).toISOString(),
      };
      await redis(["SET", recKey(m.id), JSON.stringify(pred)]); // overwrite to current model
      await redis(["SADD", INDEX_KEY, m.id]); logged++;
    }
  }
  // Re-logged cards must re-anchor their NEW picks in Bitcoin (drop the stale
  // commitment so the pass below re-creates it). Pre-fight only, so still honest.
  for (const slug of relogged) await invalidateCommitment(slug);

  // Commit each FULLY-logged upcoming card once: hash its exact pick-set and
  // anchor that hash in Bitcoin (OpenTimestamps) BEFORE the fights, so anyone can
  // later prove the picks weren't back-dated. Idempotent — first lock wins.
  for (const e of allEvents()) {
    if (new Date(e.date).getTime() <= nowMs) continue;
    const picks: CommitPick[] = [];
    let allLogged = true;
    for (const m of e.matchups) {
      if (!getFighterById(m.fighterA) || !getFighterById(m.fighterB)) continue; // skip unscorable
      const raw = await redis<string | null>(["GET", recKey(m.id)]);
      if (!raw) { allLogged = false; break; }
      const p = JSON.parse(raw) as Prediction;
      picks.push({ boutId: m.id, side: p.predWinnerSide, probA: p.predProbA, method: p.predMethod });
    }
    if (allLogged && picks.length) {
      try { await commitCard({ eventSlug: e.slug, eventName: e.name, eventDate: e.date, committedAt: new Date(nowMs).toISOString(), canonical: canonicalCard(e.slug, MODEL_VERSION, picks) }); } catch { /* best-effort */ }
    }
  }
  return { logged, alreadyLogged, bouts };
}

// ---- 2) Grade predictions whose fight has happened, against real results ----
export async function gradeDue(nowMs: number): Promise<{ graded: number; pending: number }> {
  if (!authEnabled) return { graded: 0, pending: 0 };
  const ids = (await redis<string[]>(["SMEMBERS", INDEX_KEY])) ?? [];
  let graded = 0, pending = 0;
  for (const id of ids) {
    const raw = await redis<string | null>(["GET", recKey(id)]);
    if (!raw) continue;
    const p: Prediction = JSON.parse(raw);
    if (p.graded) continue;
    const res = await fetchBoutResult(p.aId, p.bName, p.bSlug, p.date, nowMs);
    if (!res) { pending++; continue; }
    const actualWinnerSide: "A" | "B" = res.winnerIsA ? "A" : "B";
    const actualMethod = res.method;
    const correctWinner = actualWinnerSide === p.predWinnerSide;
    let correctMethod: boolean | null = null;
    if (actualMethod === "Decision") correctMethod = p.predMethod === "Decision";
    else if (actualMethod === "KO/TKO" || actualMethod === "Submission") correctMethod = p.predMethod === actualMethod;
    else if (actualMethod === "Finish") correctMethod = p.predMethod === "Decision" ? false : null; // we know it wasn't a decision; can't verify which finish
    const next: Prediction = { ...p, graded: true, gradedAt: new Date(nowMs).toISOString(), actualWinnerSide, actualMethod, correctWinner, correctMethod };
    await redis(["SET", recKey(id), JSON.stringify(next)]);
    graded++;
  }
  return { graded, pending };
}

export interface AccuracyRecord {
  enabled: boolean;
  loggedTotal: number;
  pending: number;     // logged, fight not yet graded
  graded: number;      // graded & valid (logged before the fight)
  winAccuracy: number | null;
  methodAccuracy: number | null;
  methodGraded: number;
  brier: number | null;     // lower is better (0 = perfect, 0.25 = coin flip)
  logLoss: number | null;   // lower is better
  calibration: { bucket: string; predicted: number; actual: number; n: number }[];
  recent: {
    eventName: string; date: string; aName: string; bName: string;
    pickName: string; pickProb: number; predMethod: MethodLabel;
    actualWinnerName: string; actualMethod: ActualMethod | null;
    correctWinner: boolean; correctMethod: boolean | null;
  }[];
  modelVersion: string;
}

// ---- 3) Public verified record (only predictions logged BEFORE their fight) ----
export async function getRecord(): Promise<AccuracyRecord> {
  const empty: AccuracyRecord = {
    enabled: authEnabled, loggedTotal: 0, pending: 0, graded: 0,
    winAccuracy: null, methodAccuracy: null, methodGraded: 0, brier: null, logLoss: null,
    calibration: [], recent: [], modelVersion: MODEL_VERSION,
  };
  if (!authEnabled) return empty;
  let ids: string[] = [];
  try { ids = (await redis<string[]>(["SMEMBERS", INDEX_KEY])) ?? []; } catch { return empty; }
  if (!ids.length) return empty;
  const keys = ids.map(recKey);
  const raws = (await redis<(string | null)[]>(["MGET", ...keys])) ?? [];
  const all: Prediction[] = raws.filter(Boolean).map((r) => JSON.parse(r as string));

  // Honesty gate: a prediction counts only if it was logged strictly before the fight.
  const valid = all.filter((p) => p.graded && p.actualWinnerSide && new Date(p.loggedAt).getTime() < new Date(p.date).getTime());
  const pending = all.filter((p) => !p.graded).length;

  if (!valid.length) return { ...empty, loggedTotal: all.length, pending };

  const n = valid.length;
  const winAccuracy = valid.filter((p) => p.correctWinner).length / n;
  const methodSet = valid.filter((p) => p.correctMethod !== null && p.correctMethod !== undefined);
  const methodAccuracy = methodSet.length ? methodSet.filter((p) => p.correctMethod).length / methodSet.length : null;

  let brierSum = 0, llSum = 0;
  for (const p of valid) {
    const yA = p.actualWinnerSide === "A" ? 1 : 0;
    const pA = Math.min(1 - 1e-6, Math.max(1e-6, p.predProbA));
    brierSum += (pA - yA) ** 2;
    llSum += -(yA * Math.log(pA) + (1 - yA) * Math.log(1 - pA));
  }

  // Calibration: bucket by the WINNER-pick probability (0.5..1).
  const buckets = [
    { lo: 0.5, hi: 0.6 }, { lo: 0.6, hi: 0.7 }, { lo: 0.7, hi: 0.8 }, { lo: 0.8, hi: 0.9 }, { lo: 0.9, hi: 1.01 },
  ];
  const calibration = buckets.map((bk) => {
    const inB = valid.filter((p) => {
      const pp = p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA;
      return pp >= bk.lo && pp < bk.hi;
    });
    const predicted = inB.length ? inB.reduce((s, p) => s + (p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA), 0) / inB.length : 0;
    const actual = inB.length ? inB.filter((p) => p.correctWinner).length / inB.length : 0;
    return { bucket: `${Math.round(bk.lo * 100)}–${Math.round(Math.min(1, bk.hi) * 100)}%`, predicted, actual, n: inB.length };
  }).filter((b) => b.n > 0);

  const recent = valid
    .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
    .slice(0, 14)
    .map((p) => ({
      eventName: p.eventName, date: p.date, aName: p.aName, bName: p.bName,
      pickName: p.predWinnerSide === "A" ? p.aName : p.bName,
      pickProb: p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA,
      predMethod: p.predMethod,
      actualWinnerName: p.actualWinnerSide === "A" ? p.aName : p.bName,
      actualMethod: p.actualMethod ?? null,
      correctWinner: !!p.correctWinner,
      correctMethod: p.correctMethod ?? null,
    }));

  return {
    enabled: true, loggedTotal: all.length, pending, graded: n,
    winAccuracy, methodAccuracy, methodGraded: methodSet.length,
    brier: brierSum / n, logLoss: llSum / n, calibration, recent, modelVersion: MODEL_VERSION,
  };
}

// Per-fighter display data for the simulator-style result hero (portrait via
// slug, flag, record, weight class). Resolved from the live roster.
export interface PickFighter {
  name: string; slug: string; flag: string; country: string; record: string; weightClass: string; nickname?: string;
  image?: string; // headshot/portrait — fallback when no full-body torso exists
}
// Bout position within its card from the bout id ("b1"/"e2-b1" = main event).
// Lower = earlier in the running order (main event first).
function boutOrder(boutId: string): number {
  const m = boutId.match(/b(\d+)$/);
  return m ? parseInt(m[1], 10) : 999;
}
function pickFighter(id: string, name: string, slug: string): PickFighter {
  const f = getFighterById(id);
  if (f) return { name: f.name, slug: f.slug, flag: f.flag, country: f.country, record: recordString(f.record), weightClass: f.weightClass, nickname: f.nickname, image: f.image };
  return { name, slug, flag: "", country: "—", record: "", weightClass: "" };
}

export interface PastPick {
  boutId: string;
  a: PickFighter; b: PickFighter; pickSide: "A" | "B"; probA: number; confidence: number;
  aName: string; bName: string;
  pickName: string; pickProb: number; predMethod: MethodLabel;
  actualWinnerName: string; actualMethod: ActualMethod | null;
  correctWinner: boolean; correctMethod: boolean | null;
}
// A locked-in pick whose fight hasn't happened yet (logged BEFORE the event,
// result pending). Same pick fields as a settled one, minus the outcome.
export interface UpcomingPick {
  boutId: string;
  a: PickFighter; b: PickFighter; pickSide: "A" | "B"; probA: number; confidence: number;
  aName: string; bName: string;
  pickName: string; pickProb: number; predMethod: MethodLabel;
}
export interface UpcomingCard {
  eventName: string; eventSlug: string; date: string; picks: UpcomingPick[];
}
export interface PastCard {
  eventName: string; eventSlug: string; date: string;
  correct: number; total: number; picks: PastPick[];
}

// Settled picks grouped by fight card (newest first) — the "Past Picks" view.
// Only includes predictions that were logged BEFORE their fight and have been
// graded against the real result, so the page is honest by construction.
export async function getPastPicks(): Promise<{ enabled: boolean; cards: PastCard[]; upcoming: UpcomingCard[]; pending: number; modelVersion: string }> {
  if (!authEnabled) return { enabled: false, cards: [], upcoming: [], pending: 0, modelVersion: MODEL_VERSION };
  const all = await loadAll();
  const valid = all.filter((p) => p.graded && p.actualWinnerSide && new Date(p.loggedAt).getTime() < new Date(p.date).getTime());
  const pendingPicks = all.filter((p) => !p.graded);
  const pending = pendingPicks.length;

  // Locked-in picks for fights that haven't happened yet — grouped by card,
  // soonest first. Proof the model committed BEFORE the result.
  const byUpcoming = new Map<string, UpcomingCard>();
  for (const p of pendingPicks) {
    let c = byUpcoming.get(p.eventSlug);
    if (!c) { c = { eventName: p.eventName, eventSlug: p.eventSlug, date: p.date, picks: [] }; byUpcoming.set(p.eventSlug, c); }
    c.picks.push({
      boutId: p.boutId,
      a: pickFighter(p.aId, p.aName, p.aSlug), b: pickFighter(p.bId, p.bName, p.bSlug),
      pickSide: p.predWinnerSide, probA: p.predProbA,
      confidence: p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA,
      aName: p.aName, bName: p.bName,
      pickName: p.predWinnerSide === "A" ? p.aName : p.bName,
      pickProb: p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA,
      predMethod: p.predMethod,
    });
  }
  const upcoming = [...byUpcoming.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // Order each card by bout position so the MAIN EVENT (bout b1) is always first,
  // then co-main, etc. — the card's real running order, not win probability.
  for (const c of upcoming) c.picks.sort((x, y) => boutOrder(x.boutId) - boutOrder(y.boutId));

  const byCard = new Map<string, PastCard>();
  for (const p of valid) {
    let c = byCard.get(p.eventSlug);
    if (!c) { c = { eventName: p.eventName, eventSlug: p.eventSlug, date: p.date, correct: 0, total: 0, picks: [] }; byCard.set(p.eventSlug, c); }
    c.total++;
    if (p.correctWinner) c.correct++;
    c.picks.push({
      boutId: p.boutId,
      a: pickFighter(p.aId, p.aName, p.aSlug), b: pickFighter(p.bId, p.bName, p.bSlug),
      pickSide: p.predWinnerSide, probA: p.predProbA,
      confidence: p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA,
      aName: p.aName, bName: p.bName,
      pickName: p.predWinnerSide === "A" ? p.aName : p.bName,
      pickProb: p.predWinnerSide === "A" ? p.predProbA : 1 - p.predProbA,
      predMethod: p.predMethod,
      actualWinnerName: p.actualWinnerSide === "A" ? p.aName : p.bName,
      actualMethod: p.actualMethod ?? null,
      correctWinner: !!p.correctWinner,
      correctMethod: p.correctMethod ?? null,
    });
  }
  const cards = [...byCard.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const c of cards) c.picks.sort((x, y) => boutOrder(x.boutId) - boutOrder(y.boutId)); // main event first
  return { enabled: true, cards, upcoming, pending, modelVersion: MODEL_VERSION };
}
