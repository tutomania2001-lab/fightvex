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
