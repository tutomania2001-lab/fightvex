// FightVex announcements / changelog — our own developments and achievements.
// Newest first. Every claim here is true and verifiable on the site; no
// fabricated accuracy or hype. Add an entry at the TOP when something ships.
export type NewsTag = "Milestone" | "Feature" | "Transparency";
export interface FxNews { date: string; tag: NewsTag; title: string; body: string; href?: string; }

export const FIGHTVEX_NEWS: FxNews[] = [
  {
    date: "2026-06-07",
    tag: "Milestone",
    title: "First live event: Vex AI goes 10/12 and calls the main-event upset",
    body:
      "This is a real milestone for us. FightVex was built on one promise — picks locked and Bitcoin-timestamped BEFORE the fights, then graded against reality so we can never back-date or cherry-pick. For UFC Fight Night: Muhammad vs. Bonfim, that promise met the cage for the first time, and the model delivered: 10 of 12 winners (83%), including correctly backing underdog Gabriel Bonfim to upset former champion Belal Muhammad in the main event. Two of the same day's improvements paid off live too — the short-notice handicap (Bryce Mitchell) and a model-sync fix (Brendan Allen). You don't have to take our word for any of it: every pick is timestamped on the blockchain and graded on the Accuracy page. Honest context, because that's the whole point: one card is a small sample, and the model's validated long-run accuracy is ~62% — this was a hot night, not a new baseline. The number that matters is the one we build in the open, card after card.",
    href: "/accuracy",
  },
  {
    date: "2026-06-07",
    tag: "Milestone",
    title: "The road ahead — how we push for higher accuracy, honestly",
    body:
      "After a strong debut, here's exactly where we're headed — and how we get there without ever faking progress. The honest reality first: re-slicing the same box-score data has hit a ceiling (~62%), and we proved it by testing four upgrades (style matchups, behavioral mining, an Elo rating engine, and round-by-round striking detail) — none beat the model, so none shipped to the predictor. The real levers from here are: (1) a growing PUBLIC forward-test record — every card graded against Bitcoin-locked picks, so our true rate is earned in the open; (2) fight-week signals that genuinely swing fights — short-notice replacements (already live, already paid off), with missed weight and injuries next; (3) market-edge tracking — finding where our model beats the closing line, the metric that actually matters for a bettor. Every change must pass a leakage-free backtest before it ships. We'd rather earn your trust slowly and truthfully than dazzle you with a number we can't defend.",
  },
  {
    date: "2026-06-07",
    tag: "Feature",
    title: "The schedule now rolls forward automatically",
    body:
      "As each card settles, the next UFC events roll up on their own — the soonest headlines a live countdown, and every fight is pre-predicted and Bitcoin-timestamped in advance. Up next: UFC Freedom 250 (Topuria vs. Gaethje), then Kape vs. Horiguchi, then Fiziev vs. Torres — all locked in and verifiable.",
    href: "/events",
  },
  {
    date: "2026-06-07",
    tag: "Feature",
    title: "Striking Profiles: how every fighter actually strikes",
    body:
      "Fighter pages now carry a Striking Profile built from 8,693 real UFCStats fights — the mix of where each fighter's significant strikes land (head/body/leg) and from where (distance/clinch/ground), with a plain-language read like “range head-hunter” or “leg-kick specialist.” It's descriptive insight drawn from real fight data, clearly labelled — not a prediction input.",
  },
  {
    date: "2026-06-06",
    tag: "Feature",
    title: "Style Matchup read in the simulator",
    body:
      "The simulator now names each fighter's archetype — Pressure Striker, Wrestler, Submission Grappler, Counter-Striker, Knockout Artist — and gives a “styles make fights” read for the matchup, all derived from real career statistics.",
  },
  {
    date: "2026-06-06",
    tag: "Transparency",
    title: "We tested four ways to make the model smarter — and told you the truth",
    body:
      "We ran leakage-free backtests on style-matchup features, behavioral mining, an opponent-adjusted Elo rating engine, and round-by-round striking detail (after crawling all 8,693 UFC fights on record). None beat the current model — the honest box-score ceiling sits around 62%. Rather than ship a cosmetic “upgrade,” we kept the validated model and put the new data where it genuinely belongs: as insight. We don't dress up noise as progress.",
  },
  {
    date: "2026-06-06",
    tag: "Feature",
    title: "Bitcoin-verified picks, surfaced everywhere",
    body:
      "Every card's picks are hashed and anchored in the Bitcoin blockchain before the fights happen. You can now recompute that hash in your own browser — from the Upcoming, Past Picks and Accuracy tabs — to prove for yourself the picks were locked in advance and never back-dated.",
    href: "/accuracy",
  },
  {
    date: "2026-06-06",
    tag: "Feature",
    title: "Short-notice awareness — and it paid off immediately",
    body:
      "The engine now accounts for short-notice replacements (a real preparation handicap). Its first live test: it flipped the Mitchell vs. Luna pick to Bryce Mitchell because Luna stepped in short — and Mitchell won.",
  },
  {
    date: "2026-06-06",
    tag: "Feature",
    title: "Simulator now runs 50,000 simulations",
    body:
      "The fight simulator runs a single high-precision 50,000-run pass, so results are stable and converged every time you run a matchup.",
  },
];
