# FightVex — Overnight Autonomous Session (started 2026-06-08)

Working autonomously on safe, additive improvements while Bernardo sleeps.
Rules: ship only additive/reversible work (typecheck + build + smoke before deploy);
queue anything needing keys/money/new tools/product decisions for approval below.

## ✅ Shipped (live on fightvex.com)
- **Programmatic matchup-prediction pages** — `/predict/<a>-vs-<b>` for every real bout on every card. Each page: Vex AI win %, method-of-victory split, likely round, real odds + value lean, key factors, "Open in Simulator" deep-link, FAQ, and SportsEvent + FAQPage + Breadcrumb JSON-LD. Added to sitemap; linked from each bout on the event pages ("Full prediction →"). _(This is the top organic-growth lever — long-tail "who wins X vs Y" search.)_ — pending deploy verify.

## 🔧 In progress / queued (safe, no approval needed)
- PostHog funnel events (signup → pricing → checkout-start → sim-run).
- `/api/health` (data-freshness + last-cron timestamps) for silent-breakage visibility.
- Dynamic OG share images for fighter + matchup pages.

## ⚠ NEEDS YOUR APPROVAL (not done — explained for you)
_(none yet — will fill in as I hit anything requiring keys, money, a new tool, or a product/billing/model decision)_

## 💡 Backlog (bigger, for when you're back)
- Real bet-logging ledger (DB + product calls) — see NEXT_SESSION_PLAN roadmap.
- 7-day free Pro trial (billing change — needs your OK).
- Model: fight-week signals (missed weight), model-vs-closing-line tracking.
