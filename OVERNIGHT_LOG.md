# FightVex — Overnight Autonomous Session (started 2026-06-08)

Working autonomously on safe, additive improvements while Bernardo sleeps.
Rules: ship only additive/reversible work (typecheck + build + smoke before deploy);
queue anything needing keys/money/new tools/product decisions for approval below.

## ✅ Shipped & verified live (fightvex.com)
- **Programmatic matchup-prediction pages** — `/predict/<a>-vs-<b>` for every bout: Vex AI win %, method split, likely round, real odds + value lean, key factors, "Open in Simulator", FAQ + SportsEvent/FAQPage/Breadcrumb JSON-LD. In sitemap; linked "Full prediction →" from each bout on event pages. ✔ 200 (e.g. /predict/ilia-topuria-vs-justin-gaethje). _(+~80 indexable long-tail pages.)_
- **PostHog funnel events** — `checkout_started`, `signup`/`login` (+identify), `simulation_run`. Dormant unless the PostHog key is set. ✔ deployed.
- **`/api/health`** — freshness probe: events/fighters counts, next event, odds capture age, backtest, `warnings[]`. ✔ returns `{ok:true, warnings:[]}`.
- **OG share cards (matchups)** — branded "A vs B · Vex AI favors X · N%" PNG per `/predict` page. ✔ 200 image/png (66KB).

## 🔧 In progress (safe, no approval)
- **`/predict` hub** — all upcoming AI predictions in one scannable list, CollectionPage/ItemList schema, linked from /events, in sitemap. _(Deploying.)_
- **Fighter OG share cards** — per-fighter share PNG (name, record, weight class, rank). _(Building.)_

## Next up (safe)
- "Predictions" in the top nav for discoverability.
- Re-verify all pages + final smoke test; update this log into a morning summary.

## ⚠ NEEDS YOUR APPROVAL (not done — explained for you)
_(none yet — will fill in as I hit anything requiring keys, money, a new tool, or a product/billing/model decision)_

## 💡 Backlog (bigger, for when you're back)
- Real bet-logging ledger (DB + product calls) — see NEXT_SESSION_PLAN roadmap.
- 7-day free Pro trial (billing change — needs your OK).
- Model: fight-week signals (missed weight), model-vs-closing-line tracking.
