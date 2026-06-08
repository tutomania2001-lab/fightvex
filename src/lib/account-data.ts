// ============================================================
// FightVex — per-user account data (server-only).
//
// Saved "insights" (simulations the user keeps), engagement stats, and a fighter
// watchlist, stored in Supabase Postgres (tables: insights, user_stats,
// watchlist). Access goes through the request-scoped Supabase client, so Row
// Level Security guarantees each user only ever touches their own rows.
// ============================================================
import { createSupabaseServerClient } from "./supabase/server";
import { getFighterById } from "./data/fighters";
import { findRealBout, fetchBoutResult } from "./predictions";

// ---- engagement stats (streak + lifetime sim counter) ----
export type UserStats = {
  streak: number; // consecutive days active
  lastActive: string; // YYYY-MM-DD
  sims: number; // lifetime simulations saved (monotonic)
};

const dayStr = (d: number) => new Date(d).toISOString().slice(0, 10);

export async function getStats(userId: string): Promise<UserStats> {
  const sb = await createSupabaseServerClient();
  const { data } = await sb
    .from("user_stats")
    .select("streak, last_active, sims")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    streak: data?.streak ?? 0,
    lastActive: data?.last_active ?? "",
    sims: data?.sims ?? 0,
  };
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
    const sb = await createSupabaseServerClient();
    // upsert touches only the provided columns on conflict, preserving sims.
    await sb
      .from("user_stats")
      .upsert(
        { user_id: userId, streak: stats.streak, last_active: today },
        { onConflict: "user_id" }
      );
  }
  return stats;
}

async function bumpSimCount(userId: string): Promise<void> {
  const stats = await getStats(userId);
  const sb = await createSupabaseServerClient();
  await sb
    .from("user_stats")
    .upsert({ user_id: userId, sims: stats.sims + 1 }, { onConflict: "user_id" });
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

// ---- row <-> SavedInsight mapping (DB is snake_case) ----
type InsightRow = {
  id: string;
  a_id: string;
  a_name: string;
  b_id: string;
  b_name: string;
  winner_name: string;
  method: string;
  confidence: number;
  prob_a: number;
  rounds: number;
  runs: number;
  note: string | null;
  bout_id: string | null;
  fight_date: string | null;
  graded: boolean;
  graded_at: string | null;
  actual_winner_name: string | null;
  correct_winner: boolean | null;
  created_at: string;
};

function rowToInsight(r: InsightRow): SavedInsight {
  return {
    id: r.id,
    type: "simulation",
    aId: r.a_id,
    aName: r.a_name,
    bId: r.b_id,
    bName: r.b_name,
    winnerName: r.winner_name,
    method: r.method,
    confidence: r.confidence,
    probA: r.prob_a,
    rounds: r.rounds,
    runs: r.runs,
    note: r.note ?? undefined,
    createdAt: r.created_at,
    boutId: r.bout_id ?? undefined,
    fightDate: r.fight_date ?? undefined,
    graded: r.graded,
    gradedAt: r.graded_at ?? undefined,
    actualWinnerName: r.actual_winner_name ?? undefined,
    correctWinner: r.correct_winner ?? undefined,
  };
}

// ---- insights ----
export async function listInsights(userId: string): Promise<SavedInsight[]> {
  const sb = await createSupabaseServerClient();
  const { data } = await sb
    .from("insights")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as InsightRow[]).map(rowToInsight);
}

export async function saveInsight(
  userId: string,
  data: Omit<SavedInsight, "id" | "createdAt" | "type">
): Promise<SavedInsight> {
  // If this matchup is a real scheduled bout, stamp it so we can grade the pick
  // against the real result later (even after the event leaves the rolling window).
  const bout = findRealBout(data.aId, data.bId);
  const sb = await createSupabaseServerClient();
  const { data: inserted, error } = await sb
    .from("insights")
    .insert({
      user_id: userId,
      a_id: data.aId,
      a_name: data.aName,
      b_id: data.bId,
      b_name: data.bName,
      winner_name: data.winnerName,
      method: data.method,
      confidence: data.confidence,
      prob_a: data.probA,
      rounds: data.rounds,
      runs: data.runs,
      note: data.note ?? null,
      bout_id: bout?.boutId ?? null,
      fight_date: bout?.date ?? null,
    })
    .select("*")
    .single();
  if (error || !inserted) throw new Error(error?.message || "Failed to save insight");
  await bumpSimCount(userId); // lifetime counter for badges (survives deletes)
  return rowToInsight(inserted as InsightRow);
}

// Per-user prediction record — REAL grading. Grades any saved pick whose fight
// has happened against the actual result (same path as the public record), and
// persists the outcome on the insight. Returns {total, resolved, correct,
// pending} (pending = real bouts not yet resolved). Call on account load.
export type UserRecord = { total: number; resolved: number; correct: number; pending: number };
export async function userRecord(userId: string, nowMs: number): Promise<UserRecord> {
  const sb = await createSupabaseServerClient();
  const list = await listInsights(userId);
  let resolved = 0, correct = 0, pending = 0;
  let lookups = 0; // cap heavy per-request ESPN result lookups (load protection)

  for (const ins of list) {
    if (ins.graded) { resolved++; if (ins.correctWinner) correct++; continue; }
    // Backfill the bout link for older saves that predate the stamp.
    let fightDate = ins.fightDate;
    if (!fightDate) {
      const rb = findRealBout(ins.aId, ins.bId);
      if (rb) {
        fightDate = rb.date;
        await sb.from("insights").update({ bout_id: rb.boutId, fight_date: rb.date }).eq("id", ins.id);
      }
    }
    if (!fightDate) continue; // not a real scheduled bout → not gradeable
    // A future bout can't be graded yet — skip the ESPN lookup entirely. This
    // stops the hub from hammering ESPN for not-yet-happened picks.
    if (new Date(fightDate).getTime() > nowMs) { pending++; continue; }
    // Bound live result lookups per request so one hub load can never fan out into
    // hundreds of ESPN calls; anything beyond the cap grades on the next load/cron.
    if (lookups >= 5) { pending++; continue; }
    lookups++;
    const b = getFighterById(ins.bId);
    const res = await fetchBoutResult(ins.aId, ins.bName, b?.slug, fightDate, nowMs);
    if (!res) { pending++; continue; } // fight not resolved yet
    const actualWinnerName = res.winnerIsA ? ins.aName : ins.bName;
    const correctWinner = actualWinnerName === ins.winnerName;
    await sb
      .from("insights")
      .update({
        graded: true,
        graded_at: new Date(nowMs).toISOString(),
        actual_winner_name: actualWinnerName,
        correct_winner: correctWinner,
      })
      .eq("id", ins.id);
    resolved++;
    if (correctWinner) correct++;
  }

  return { total: list.length, resolved, correct, pending };
}

export async function deleteInsight(userId: string, id: string): Promise<void> {
  const sb = await createSupabaseServerClient();
  await sb.from("insights").delete().eq("id", id).eq("user_id", userId);
}

// ---- watchlist ----
export async function listWatch(userId: string): Promise<WatchItem[]> {
  const sb = await createSupabaseServerClient();
  const { data } = await sb
    .from("watchlist")
    .select("fighter_id, name, added_at")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  return ((data ?? []) as { fighter_id: string; name: string; added_at: string }[]).map((r) => ({
    fighterId: r.fighter_id,
    name: r.name,
    addedAt: r.added_at,
  }));
}

export async function addWatch(userId: string, fighterId: string, name: string): Promise<WatchItem[]> {
  const sb = await createSupabaseServerClient();
  // (user_id, fighter_id) is the PK — ignore duplicates so re-watching is a no-op.
  await sb
    .from("watchlist")
    .upsert({ user_id: userId, fighter_id: fighterId, name }, { onConflict: "user_id,fighter_id", ignoreDuplicates: true });
  return listWatch(userId);
}

export async function removeWatch(userId: string, fighterId: string): Promise<WatchItem[]> {
  const sb = await createSupabaseServerClient();
  await sb.from("watchlist").delete().eq("user_id", userId).eq("fighter_id", fighterId);
  return listWatch(userId);
}

// ---- bet log / bankroll ledger (Pro) — own rows only (RLS) ----
export type Bet = {
  id: string;
  boutId: string | null;
  selection: string; // fighter / market label
  stake: number; // units
  oddsTaken: number; // American odds when placed
  closingOdds: number | null; // American odds at close (for CLV)
  result: "win" | "loss" | "push" | null; // null = open
  placedAt: string;
  settledAt: string | null;
};

type BetRow = {
  id: string;
  bout_id: string | null;
  selection: string;
  stake: number;
  odds_taken: number;
  closing_odds: number | null;
  result: Bet["result"];
  placed_at: string;
  settled_at: string | null;
};

const toBet = (r: BetRow): Bet => ({
  id: r.id,
  boutId: r.bout_id,
  selection: r.selection,
  stake: r.stake,
  oddsTaken: r.odds_taken,
  closingOdds: r.closing_odds,
  result: r.result,
  placedAt: r.placed_at,
  settledAt: r.settled_at,
});

const BET_COLS = "id, bout_id, selection, stake, odds_taken, closing_odds, result, placed_at, settled_at";

export async function listBets(userId: string): Promise<Bet[]> {
  const sb = await createSupabaseServerClient();
  const { data } = await sb.from("bets").select(BET_COLS).eq("user_id", userId).order("placed_at", { ascending: false });
  return ((data ?? []) as BetRow[]).map(toBet);
}

export async function addBet(
  userId: string,
  input: { selection: string; stake: number; oddsTaken: number; boutId?: string | null }
): Promise<Bet[]> {
  const sb = await createSupabaseServerClient();
  await sb.from("bets").insert({
    user_id: userId,
    selection: input.selection,
    stake: input.stake,
    odds_taken: Math.round(input.oddsTaken),
    bout_id: input.boutId ?? null,
  });
  return listBets(userId);
}

export async function updateBet(
  userId: string,
  id: string,
  patch: { result?: Bet["result"]; closingOdds?: number | null }
): Promise<Bet[]> {
  const sb = await createSupabaseServerClient();
  const upd: Record<string, unknown> = {};
  if (patch.result !== undefined) {
    upd.result = patch.result;
    upd.settled_at = patch.result ? new Date().toISOString() : null;
  }
  if (patch.closingOdds !== undefined) upd.closing_odds = patch.closingOdds === null ? null : Math.round(patch.closingOdds);
  if (Object.keys(upd).length) await sb.from("bets").update(upd).eq("user_id", userId).eq("id", id);
  return listBets(userId);
}

export async function deleteBet(userId: string, id: string): Promise<Bet[]> {
  const sb = await createSupabaseServerClient();
  await sb.from("bets").delete().eq("user_id", userId).eq("id", id);
  return listBets(userId);
}
