// ============================================================
// FightVex — plan & tool entitlements (shared, client + server safe).
//
// Model: a free browse tier + ONE paid plan ("Full Access") that unlocks
// everything. Internal plan id stays "pro" (= Full Access); "elite" is a
// legacy id kept only so any existing Elite subscriber still gets full access.
// No server-only imports, so this can run in client components too.
// ============================================================

export type Plan = "free" | "pro" | "elite";

// Higher = more access. "pro" (Full Access) and legacy "elite" both = full.
export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, elite: 1 };

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Full Access", elite: "Full Access" };

export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  minPlan: Plan; // lowest plan that unlocks this tool
  category: "Analysis" | "Betting" | "Research";
};

// Tools surfaced in the account hub's "Tools & access" matrix. Everything beyond
// the free browse tier unlocks with Full Access (minPlan: "pro").
export const TOOLS: Tool[] = [
  { id: "fighter-profiles", name: "Fighter Profiles", description: "Core stats, records and matchup context for every fighter.", href: "/fighters", minPlan: "free", category: "Analysis" },
  { id: "fight-cards", name: "Fight Cards", description: "Upcoming UFC cards with countdowns and bout breakdowns.", href: "/events", minPlan: "free", category: "Analysis" },
  { id: "simulator-preview", name: "Simulator Preview", description: "Watch one sample matchup simulate (controls locked on the free tier).", href: "/simulator", minPlan: "free", category: "Analysis" },
  { id: "research-feed", name: "Research Feed", description: "Live UFC news aggregated from trusted outlets.", href: "/research", minPlan: "free", category: "Research" },
  { id: "watchlists", name: "Watchlist", description: "Follow fighters, saved to your account.", href: "/account?section=watchlist", minPlan: "free", category: "Research" },
  { id: "simulator", name: "Unlimited Simulator", description: "Unlimited 50,000-run simulations — any matchup, any rounds, re-run freely.", href: "/simulator", minPlan: "pro", category: "Analysis" },
  { id: "full-profiles", name: "Full Fighter Profiles", description: "Every tracked metric, trajectory and risk flag per fighter.", href: "/fighters", minPlan: "pro", category: "Analysis" },
  { id: "line-movement", name: "Line-Movement Tracker", description: "Live moneyline time-series and consensus drift per bout.", href: "/betting", minPlan: "pro", category: "Betting" },
  { id: "ev-tools", name: "EV & No-Vig Tools", description: "Expected-value, no-vig implied probability and edge calculators.", href: "/betting", minPlan: "pro", category: "Betting" },
  { id: "clv-tool", name: "Closing-Line-Value Tool", description: "Compare each bout's opening line to the latest market line.", href: "/betting", minPlan: "pro", category: "Betting" },
  { id: "bankroll", name: "Bankroll Calculator", description: "Fractional-Kelly unit sizing with a sensible stake cap.", href: "/betting", minPlan: "pro", category: "Betting" },
  { id: "watchlist-alerts", name: "Watchlist Alerts", description: "Get emailed when a watched fighter is booked on a card.", href: "/account?section=watchlist", minPlan: "pro", category: "Research" },
];

export function hasAccess(plan: Plan, minPlan: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

export function toolsForPlan(plan: Plan): { unlocked: Tool[]; locked: Tool[] } {
  const unlocked = TOOLS.filter((t) => hasAccess(plan, t.minPlan));
  const locked = TOOLS.filter((t) => !hasAccess(plan, t.minPlan));
  return { unlocked, locked };
}
