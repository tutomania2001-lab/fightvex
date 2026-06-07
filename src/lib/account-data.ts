// ============================================================
// FightVex — per-user account data (server-only).
//
// Saved "insights" (simulations the user keeps) and a fighter
// watchlist, stored as JSON arrays in the same Upstash Redis as auth.
//
// Keys:
//   insights:<userId>   -> JSON SavedInsight[]  (newest first, capped)
//   watchlist:<userId>  -> JSON WatchItem[]      (newest first, capped)
// ============================================================
import { randomUUID } from "crypto";
import { redis } from "./auth";
import { getFighterById } from "./data/fighters";
import { findRealBout, fetchBoutResult } from "./predictions";

const INSIGHTS_CAP = 100;
const WATCH_CAP = 100;

// ---- engagement stats (streak + lifetime sim counter) ----
export type UserStats = {
  streak: number; // consecutive days active
  lastActive: string; // YYYY-MM-DD
  sims: number; // lifetime simulations saved (monotonic)
};

const statsKey = (uid: string) => `stats:${uid}`;
const dayStr = (d: number) => new Date(d).toISOString().slice(0, 10);

export async function getStats(userId: string): Promise<UserStats> {
  const raw = await redis<string | null>(["GET", statsKey(userId)]);
  if (!raw) return { streak: 0, lastActive: "", sims: 0 };
  try {
    return { streak: 0, lastActive: "", sims: 0, ...(JSON.parse(raw) as Partial<UserStats>) };
  } catch {
    return { streak: 0, lastActive: "", sims: 0 };
  }
}

// Records a daily visit and advances the streak (today=no-op, yesterday=+1,
// gap=reset to 1). Called once when the hub loads.
export async function pingActivity(userId: string): Promise<UserStats> {
  const stats = await getStats(userId);
  const today = dayStr(Date.now());
  if (stats.lastActive !== today) {
    const yesterday = dayStr(Date.now() - 86_400_000);
    stats.streak = stats.lastActive === yesterday ? stats.streak + 1 : 1;
    stats.lastActive = today;
    await redis(["SET", statsKey(userId), JSON.stringify(stats)]);
  }
  return stats;
}

async function bumpSimCount(userId: string): Promise<void> {
  const stats = await getStats(userId);
  stats.sims += 1;
  await redis(["SET", statsKey(userId), JSON.stringify(stats)]);
}

// A saved simulation result (compact summary — enough to relist, not the
// full Monte-Carlo payload).
export type SavedInsight = {
  id: string;
  type: "simulation";
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  winnerName: string;
  method: string;
  confidence: number; // 0..1
  probA: number; // 0..1
  rounds: number;
  runs: number;
  note?: string;
  createdAt: string;
  // ---- set at save time when the matchup is a real scheduled bout, so the
  // pick can be graded later even after the event rolls out of the window ----
  boutId?: string;
  fightDate?: string;
  // ---- appended once the fight has happened and we've graded it ----
  graded?: boolean;
  gradedAt?: string;
  actualWinnerName?: string;
  correctWinner?: boolean;
};

export type WatchItem = {
  fighterId: string;
  name: string;
  addedAt: string;
};

// ---- generic JSON-array helpers ----
async function getArr<T>(key: string): Promise<T[]> {
  const raw = await redis<string | null>(["GET", key]);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

async function setArr<T>(key: string, arr: T[]): Promise<void> {
  await redis(["SET", key, JSON.stringify(arr)]);
}

const insightsKey = (uid: string) => `insights:${uid}`;
const watchKey = (uid: string) => `watchlist:${uid}`;

// ---- insights ----
export async function listInsights(userId: string): Promise<SavedInsight[]> {
  return getArr<SavedInsight>(insightsKey(userId));
}

export async function saveInsight(
  userId: string,
  data: Omit<SavedInsight, "id" | "createdAt" | "type">
): Promise<SavedInsight> {
  // If this matchup is a real scheduled bout, stamp it so we can grade the pick
  // against the real result later (even after the event leaves the rolling window).
  const bout = findRealBout(data.aId, data.bId);
  const insight: SavedInsight = {
    ...data,
    id: randomUUID(),
    type: "simulation",
    createdAt: new Date().toISOString(),
    ...(bout ? { boutId: bout.boutId, fightDate: bout.date } : {}),
  };
  const list = await listInsights(userId);
  const next = [insight, ...list].slice(0, INSIGHTS_CAP);
  await setArr(insightsKey(userId), next);
  await bumpSimCount(userId); // lifetime counter for badges (survives deletes)
  return insight;
}

// Per-user prediction record — REAL grading. Grades any saved pick whose fight
// has happened against the actual result (same path as the public record), and
// persists the outcome on the insight. Returns {total, resolved, correct,
// pending} (pending = real bouts not yet resolved). Call on account load.
export type UserRecord = { total: number; resolved: number; correct: number; pending: number };
export async function userRecord(userId: string, nowMs: number): Promise<UserRecord> {
  const list = await listInsights(userId);
  let changed = false;
  let resolved = 0, correct = 0, pending = 0;
  let lookups = 0; // cap heavy per-request ESPN result lookups (load protection)

  for (const ins of list) {
    if (ins.graded) { resolved++; if (ins.correctWinner) correct++; continue; }
    // Backfill the bout link for older saves that predate the stamp.
    if (!ins.fightDate) {
      const rb = findRealBout(ins.aId, ins.bId);
      if (rb) { ins.boutId = rb.boutId; ins.fightDate = rb.date; changed = true; }
    }
    if (!ins.fightDate) continue; // not a real scheduled bout → not gradeable
    // A future bout can't be graded yet — skip the ESPN lookup entirely. This is
    // the big one: it stops the hub from hammering ESPN for not-yet-happened picks.
    if (new Date(ins.fightDate).getTime() > nowMs) { pending++; continue; }
    // Bound live result lookups per request so one hub load can never fan out into
    // hundreds of ESPN calls; anything beyond the cap grades on the next load/cron.
    if (lookups >= 5) { pending++; continue; }
    lookups++;
    const b = getFighterById(ins.bId);
    const res = await fetchBoutResult(ins.aId, ins.bName, b?.slug, ins.fightDate, nowMs);
    if (!res) { pending++; continue; } // fight not resolved yet
    const actualWinnerName = res.winnerIsA ? ins.aName : ins.bName;
    ins.graded = true;
    ins.gradedAt = new Date(nowMs).toISOString();
    ins.actualWinnerName = actualWinnerName;
    ins.correctWinner = actualWinnerName === ins.winnerName;
    changed = true;
    resolved++;
    if (ins.correctWinner) correct++;
  }

  if (changed) await setArr(insightsKey(userId), list);
  return { total: list.length, resolved, correct, pending };
}

export async function deleteInsight(userId: string, id: string): Promise<void> {
  const list = await listInsights(userId);
  await setArr(insightsKey(userId), list.filter((i) => i.id !== id));
}

// ---- watchlist ----
export async function listWatch(userId: string): Promise<WatchItem[]> {
  return getArr<WatchItem>(watchKey(userId));
}

export async function addWatch(userId: string, fighterId: string, name: string): Promise<WatchItem[]> {
  const list = await listWatch(userId);
  if (list.some((w) => w.fighterId === fighterId)) return list; // already watching
  const next = [{ fighterId, name, addedAt: new Date().toISOString() }, ...list].slice(0, WATCH_CAP);
  await setArr(watchKey(userId), next);
  return next;
}

export async function removeWatch(userId: string, fighterId: string): Promise<WatchItem[]> {
  const list = await listWatch(userId);
  const next = list.filter((w) => w.fighterId !== fighterId);
  await setArr(watchKey(userId), next);
  return next;
}
