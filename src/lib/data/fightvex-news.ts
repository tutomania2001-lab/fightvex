// FightVex announcements / changelog — our own developments and achievements.
// Newest first. Every claim here is true and verifiable on the site; no
// fabricated accuracy or hype. Add an entry at the TOP when something ships.
export type NewsTag = "Milestone" | "Feature" | "Transparency";
export interface FxNews { date: string; tag: NewsTag; title: string; body: string; href?: string; }

export const FIGHTVEX_NEWS: FxNews[] = [
  {
    date: "2026-06-08",
    tag: "Feature",
    title: "Bet Log: track your CLV and P&L (Pro)",
    body:
      "Pro members can now log every bet in their account — stake, odds taken and the closing line — and FightVex tracks your closing-line value, win/loss record and running P&L in units. Beating the close is the metric that actually predicts long-term edge, so now you can measure yours, honestly. It's your private ledger: units only, no fabricated figures, and we never hold or place wagers. 21+.",
    href: "/account?section=bets",
  },
  {
    date: "2026-06-08",
    tag: "Feature",
    title: "Pro is now free for 7 days",
    body:
      "New members get a 7-day free trial of Pro — full simulator, every fighter metric, the line-movement tracker, EV/CLV tools, the bankroll calculator and watchlist alerts, all unlocked from day one. You're only charged £10/mo if you stay past the trial, and you can cancel anytime in your account. One trial per member.",
    href: "/pricing",
  },
  {
    date: "2026-06-08",
    tag: "Feature",
    title: "AI prediction pages for every bout",
    body:
      "Every upcoming UFC bout now has its own prediction page: the Vex AI pick and win %, the method-of-victory split, the likely round, real market odds with a value lean, a full tale-of-the-tape and the key factors — all in one place. Browse them on the new Predictions tab, or jump straight in from any fight card or fighter page. Transparent and backtested; informational only, not betting advice.",
    href: "/predict",
  },
  {
    date: "2026-06-08",
    tag: "Feature",
    title: "Simpler pricing: one Pro plan at £10/mo",
    body:
      "We scrapped the tiers. Browse free, and a single Pro plan — £10/month — unlocks everything: unlimited 50,000-run simulations, full fighter profiles, the line-movement tracker, EV and no-vig calculators, the closing-line-value tool, the bankroll (Kelly) calculator and watchlist alerts. No Pro/Elite split, no add-ons. Cancel anytime. Anyone already subscribed keeps full access.",
    href: "/pricing",
  },
  {
    date: "2026-06-07",
    tag: "Transparency",
    title: "We caught a bug hiding past picks — and restored the full record",
    body:
      "Straight talk: as the schedule rolled forward, a card-indexing flaw let an upcoming card's picks overwrite a finished card's in storage, so the Past Picks tab was showing an incomplete record. We fixed the root cause — picks are now stored per-event, so it can't recur — and rebuilt the affected UFC Fight Night: Muhammad vs. Bonfim main-card picks straight from their pre-fight Bitcoin commitment (the immutable proof of exactly what we locked in before the fights), then re-graded them against the real results. The full card is back (10/12 winners), and nothing was back-dated or invented — the commitment is the receipt, and you can still re-hash it yourself. We'd rather tell you about a bug and how we killed it than quietly paper over it.",
    href: "/accuracy",
  },
  {
    date: "2026-06-07",
    tag: "Feature",
    title: "Watchlist alerts are live (Pro)",
    body:
      "Follow a fighter and we'll email you when they're booked on an upcoming card — sent from alerts@fightvex.com with the Vex AI read a click away, so you never miss a matchup you care about. Build your watchlist from any fighter page; alerts are a Pro perk.",
    href: "/pricing",
  },
  {
    date: "2026-06-07",
    tag: "Transparency",
    title: "The model now self-corrects against its own public record",
    body:
      "We added a calibration layer that tunes Vex AI's confidence using our Bitcoin-verified live results — and, true to form, it does nothing until we have enough graded fights to be meaningful (a no-op today, by design, so we never fit to noise). It's monotonic, so it only sharpens the confidence number, never changes which fighter we favor. As the public record grows, the model gets honestly sharper on its own — earned in the open, card by card.",
    href: "/accuracy",
  },
  {
    date: "2026-06-07",
    tag: "Feature",
    title: "Accounts are live — watchlists, saved picks and billing",
    body:
      "You can now create a free FightVex account: save simulations to revisit, build a fighter watchlist, keep your own running prediction record, and manage your plan. Security is built in from the ground up — accounts run on a Postgres database with row-level security, so your data is isolated to you, and sign-in is handled by a managed auth provider (no home-rolled password storage). Free to join; Pro unlocks the advanced tools.",
    href: "/login",
  },
  {
    date: "2026-06-07",
    tag: "Transparency",
    title: "Three real-data upgrades to the engine — honestly scoped",
    body:
      "We pushed three improvements into the prediction engine, all grounded in real fight data and scoped honestly. (1) Real layoff: the model now reads each fighter's actual time since their last bout — previously a placeholder — so ring-rust is applied to the genuinely inactive, not guessed, which also brings the live engine in line with our backtest. (2) Division-aware finishes: KO / submission / decision likelihoods now scale to each weight class's real historical base rates (heavyweights finish far more often by knockout than flyweights), making the method-of-victory read more realistic. (3) Strength of schedule: a fighter's “competition quality” now reflects the real win rates of their recent opponents instead of a ranking-based estimate. Straight talk on impact: these sharpen realism and fix a placeholder — we are NOT claiming they break the ~62% winner-accuracy ceiling we've been open about (competition quality, by design, can't be isolated in a leakage-free backtest). Real data, never fabricated, scoped for what it actually does.",
    href: "/methodology",
  },
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
      "We ran leakage-free backtests on style-matchup features, behavioral mining, an opponent-adjusted Elo rating engine, and round-by-round striking detail (after crawling 8,693 UFCStats fights with striking detail). None beat the current model — the honest box-score ceiling sits around 62%. Rather than ship a cosmetic “upgrade,” we kept the validated model and put the new data where it genuinely belongs: as insight. We don't dress up noise as progress.",
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
