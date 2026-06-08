// ============================================================
// FightVex — fight-week CONTEXT that isn't in the data feed.
//
// Things like "this fighter took the bout on short notice" come from fight-week
// news, not ESPN's structured data — so the model can't infer them; we feed
// them here. The Vex AI sim already applies a preparation debuff to a
// short-notice fighter (sim.ts `shortNoticeA/B`); this list is how it learns
// who that is. Keyed by ESPN athlete id.
//
// MAINTENANCE: add a fighter when a short-notice booking is announced; remove
// them after the card. (A fighter is only "short notice" for their current bout,
// so leaving a stale entry would wrongly debuff their next, full-camp fight.)
// ============================================================
export const SHORT_NOTICE = new Set<string>([
  "5307799", // Santiago Luna — short-notice replacement vs Bryce Mitchell (UFC Fight Night, 2026-06-06)
]);

export const isShortNotice = (id: string | undefined): boolean => !!id && SHORT_NOTICE.has(id);

// Fighters who MISSED WEIGHT at the official weigh-in for their current bout —
// drained from a hard/failed cut, which the sim applies as a per-round + rating
// debuff (sim.ts `missedWeightA/B`). Same maintenance rule as SHORT_NOTICE: add
// only after the real weigh-in confirms a miss, remove after the card so it
// never debuffs the fighter's next, on-weight fight. Keyed by ESPN athlete id.
export const MISSED_WEIGHT = new Set<string>([
  // e.g. "1234567", // Fighter Name — missed weight by X lb (Event, date)
]);

export const missedWeight = (id: string | undefined): boolean => !!id && MISSED_WEIGHT.has(id);
