// ============================================================
// FightVex — plans & tool entitlements (shared, client + server safe).
//
// Single source of truth for "which plan unlocks which tool". Used by
// the account hub (access matrix), feature gates, and — later — the
// Stripe checkout to map a price to a plan. No server-only imports, so
// it can run in client components too.
// ============================================================

export type Plan = "free" | "pro" | "elite";

// Higher = more access. Used for `hasAccess` comparisons.
export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, elite: 2 };

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", elite: "Elite" };

export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  minPlan: Plan; // lowest plan that unlocks this tool
  category: "Analysis" | "Betting" | "Research";
};

// The tools surfaced in the account hub's "Tools & access" matrix. Keep the
// minPlan values in sync with the marketing copy on /pricing.
export const TOOLS: Tool[] = [
  { id: "fighter-profiles", name: "Fighter Profiles", description: "Core stats, records and matchup context for every fighter.", href: "/fighters", minPlan: "free", category: "Analysis" },
  { id: "fight-cards", name: "Fight Cards", description: "Upcoming UFC cards with countdowns and bout breakdowns.", href: "/events", minPlan: "free", category: "Analysis" },
  { id: "simulator", name: "Fight Simulator", description: "Vex AI fight simulations. Free tier is capped; Pro is unlimited.", href: "/simulator", minPlan: "free", category: "Analysis" },
  { id: "research-feed", name: "Research Feed", description: "MMA intel and news. Pro gets the real-time feed.", href: "/research", minPlan: "free", category: "Research" },
  { id: "full-profiles", name: "Full 40+ Metric Profiles", description: "Every advanced metric, trajectory and risk flag per fighter.", href: "/fighters", minPlan: "pro", category: "Analysis" },
  { id: "line-movement", name: "Line-Movement Tracker", description: "Live moneyline time-series and consensus drift per bout.", href: "/betting", minPlan: "pro", category: "Betting" },
  { id: "ev-tools", name: "EV & Implied-Prob Tools", description: "Expected-value, implied probability and edge calculators.", href: "/betting", minPlan: "pro", category: "Betting" },
  { id: "watchlists", name: "Watchlist", description: "Track fighters, saved to your account. (Real-time alerts are a Pro upgrade.)", href: "/account?section=watchlist", minPlan: "free", category: "Research" },
  { id: "watchlist-alerts", name: "Watchlist Alerts", description: "Get notified when a watched fighter is booked or their line moves.", href: "/account?section=watchlist", minPlan: "pro", category: "Research" },
  { id: "monte-carlo", name: "5,000-run Monte Carlo", description: "Deep simulation runs for tighter method/round distributions.", href: "/simulator", minPlan: "elite", category: "Analysis" },
  { id: "clv-tracker", name: "Closing Line Value Tracker", description: "Measure your CLV against closing markets over time.", href: "/betting", minPlan: "elite", category: "Betting" },
  { id: "overreaction", name: "Market-Overreaction Detector", description: "Flags bouts where the line moved past the model's read.", href: "/betting", minPlan: "elite", category: "Betting" },
  { id: "bankroll-suite", name: "Bankroll Management Suite", description: "Unit sizing, staking plans and position tracking.", href: "/betting", minPlan: "elite", category: "Betting" },
];

export function hasAccess(plan: Plan, minPlan: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

export function toolsForPlan(plan: Plan): { unlocked: Tool[]; locked: Tool[] } {
  const unlocked = TOOLS.filter((t) => hasAccess(plan, t.minPlan));
  const locked = TOOLS.filter((t) => !hasAccess(plan, t.minPlan));
  return { unlocked, locked };
}
