// ============================================================
// FightVex — personalized hub intelligence (server-only).
//
// Turns a user's watchlist + saved insights into a fight-night home:
// what's on next, which of their fighters are fighting, what to
// simulate, who to watch, an onboarding checklist, and an honest
// prediction track-record reconciled against REAL recorded results
// (never fabricated — pending until a result is verifiable).
// ============================================================
import { nextEvent, allEvents } from "./data/events";
import { allFighters, getFighterById } from "./data/fighters";
import type { Fighter, FightEvent, Matchup } from "./types";
import type { SavedInsight, WatchItem } from "./account-data";
import type { Plan } from "./entitlements";

const lastName = (n: string) => n.trim().split(/\s+/).slice(-1)[0]?.toLowerCase() || "";

export type RecommendedSim = {
  boutId: string;
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  weightClass: string;
  reason: string;
};

export type WatchedOnCard = { fighterId: string; name: string; opponentName: string; boutId: string };

export type PersonalizedHome = {
  event: { name: string; slug: string; date: string; city: string; country: string } | null;
  watchedOnCard: WatchedOnCard[];
  recommendedSims: RecommendedSim[];
  recommendedFighters: { id: string; name: string; slug: string; reason: string }[];
};

export function personalizedHome(watchlist: WatchItem[]): PersonalizedHome {
  const watched = new Set(watchlist.map((w) => w.fighterId));
  let ev: FightEvent | null = null;
  try {
    ev = nextEvent();
  } catch {
    ev = null;
  }
  if (!ev) return { event: null, watchedOnCard: [], recommendedSims: [], recommendedFighters: [] };

  const named = (id: string) => getFighterById(id);

  // Which of the user's fighters are on this card.
  const watchedOnCard: WatchedOnCard[] = [];
  for (const m of ev.matchups) {
    const a = named(m.fighterA);
    const b = named(m.fighterB);
    if (!a || !b) continue;
    if (watched.has(a.id)) watchedOnCard.push({ fighterId: a.id, name: a.name, opponentName: b.name, boutId: m.id });
    if (watched.has(b.id)) watchedOnCard.push({ fighterId: b.id, name: b.name, opponentName: a.name, boutId: m.id });
  }

  // Recommended sims: prioritize bouts with a watched fighter, then main/title,
  // then card position. Top 4.
  const scored = ev.matchups
    .map((m) => {
      const a = named(m.fighterA);
      const b = named(m.fighterB);
      if (!a || !b) return null;
      const hasWatched = watched.has(a.id) || watched.has(b.id);
      const score = (hasWatched ? 100 : 0) + (m.isMain ? 25 : 0) + (m.isTitle ? 15 : 0) + Math.max(0, 12 - m.boutOrder);
      const reason = hasWatched ? "On your watchlist" : m.isMain ? "Main event" : m.isTitle ? "Title fight" : "On the card";
      return { m, a, b, score, reason };
    })
    .filter((x): x is { m: Matchup; a: Fighter; b: Fighter; score: number; reason: string } => !!x)
    .sort((x, y) => y.score - x.score)
    .slice(0, 4);

  const recommendedSims: RecommendedSim[] = scored.map(({ m, a, b, reason }) => ({
    boutId: m.id,
    aId: a.id,
    aName: a.name,
    bId: b.id,
    bName: b.name,
    weightClass: m.weightClass,
    reason,
  }));

  // Fighters to watch: champions / top-ranked the user isn't tracking yet.
  const recommendedFighters = allFighters()
    .filter((f) => (f.champion || (f.ranking != null && f.ranking <= 5)) && !watched.has(f.id))
    .sort((a, b) => (a.champion === b.champion ? (a.ranking ?? 99) - (b.ranking ?? 99) : a.champion ? -1 : 1))
    .slice(0, 4)
    .map((f) => ({ id: f.id, name: f.name, slug: f.slug, reason: f.champion ? (f.title || "Champion") : `Ranked #${f.ranking}` }));

  return {
    event: { name: ev.name, slug: ev.slug, date: ev.date, city: ev.city, country: ev.country },
    watchedOnCard,
    recommendedSims,
    recommendedFighters,
  };
}

// ---- track record (honest reconciliation) ----
// Determine the real winner of a bout from corroborating fighter form, or null
// if it can't be verified. We never guess — unverifiable = pending.
function resolvedWinnerId(a: Fighter, b: Fighter): string | null {
  const aVsB = a.form.find((f) => lastName(f.opponent) === lastName(b.name) && (f.result === "W" || f.result === "L"));
  const bVsA = b.form.find((f) => lastName(f.opponent) === lastName(a.name) && (f.result === "W" || f.result === "L"));
  if (aVsB) {
    const winner = aVsB.result === "W" ? a.id : b.id;
    // Corroborate with the opponent's record if available.
    if (bVsA) {
      const winner2 = bVsA.result === "W" ? b.id : a.id;
      if (winner !== winner2) return null; // conflicting records -> don't claim
    }
    return winner;
  }
  if (bVsA) return bVsA.result === "W" ? b.id : a.id;
  return null;
}

export type TrackRecord = { total: number; resolved: number; correct: number; pending: number };

export function trackRecord(insights: SavedInsight[]): TrackRecord {
  let resolved = 0;
  let correct = 0;
  const events = allEvents();
  for (const ins of insights) {
    const bout = events
      .flatMap((e) => e.matchups.map((m) => ({ e, m })))
      .find(
        ({ m }) =>
          (m.fighterA === ins.aId && m.fighterB === ins.bId) ||
          (m.fighterA === ins.bId && m.fighterB === ins.aId)
      );
    if (!bout || bout.e.status !== "completed") continue;
    const a = getFighterById(ins.aId);
    const b = getFighterById(ins.bId);
    if (!a || !b) continue;
    const winnerId = resolvedWinnerId(a, b);
    if (!winnerId) continue; // not verifiable yet
    resolved++;
    const winnerName = winnerId === a.id ? a.name : b.name;
    if (winnerName === ins.winnerName) correct++;
  }
  return { total: insights.length, resolved, correct, pending: insights.length - resolved };
}

// ---- onboarding checklist ----
export type ChecklistItem = { id: string; label: string; done: boolean; href: string };

export function buildChecklist(opts: {
  insights: SavedInsight[];
  watchlist: WatchItem[];
  plan: Plan;
  home: PersonalizedHome;
}): ChecklistItem[] {
  const { insights, watchlist, plan, home } = opts;
  const mainBout = home.recommendedSims.find((s) => s.reason === "Main event") || home.recommendedSims[0];
  const simulatedMain =
    !!mainBout &&
    insights.some(
      (i) =>
        (i.aId === mainBout.aId && i.bId === mainBout.bId) ||
        (i.aId === mainBout.bId && i.bId === mainBout.aId)
    );
  const simHref = mainBout ? `/simulator?a=${mainBout.aId}&b=${mainBout.bId}` : "/simulator";
  return [
    { id: "save-sim", label: "Run & save your first simulation", done: insights.length > 0, href: "/simulator" },
    { id: "watch", label: "Add a fighter to your watchlist", done: watchlist.length > 0, href: "/fighters" },
    { id: "sim-main", label: "Simulate this week's main event", done: simulatedMain, href: simHref },
    { id: "upgrade", label: "Unlock Pro tools", done: plan !== "free", href: "/pricing" },
  ];
}
