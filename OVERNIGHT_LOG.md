# FightVex — Overnight Autonomous Session (started 2026-06-08)

Working autonomously on safe, additive improvements while Bernardo sleeps.
Rules: ship only additive/reversible work (typecheck + build + smoke before deploy);
queue anything needing keys/money/new tools/product decisions for approval below.

## ☀️ TL;DR (morning read)
Shipped + verified live tonight, all safe/additive: **(1)** programmatic matchup-prediction
pages `/predict/<a>-vs-<b>` (+~80 indexable SEO pages, full schema, OG share cards),
**(2)** a `/predict` hub + "Predictions" nav link, **(3)** PostHog conversion funnel events,
**(4)** `/api/health` freshness probe, **(5)** fighter→prediction cross-links.
**(6)** a full tale-of-the-tape on every predict page, plus **fighter OG share cards**
(initially 500'd, root-caused & fixed — see below). Posted a **FightVex News** entry
announcing the prediction pages. **Nothing needed your approval** — approval queue is empty.

**Status:** the safe, no-approval backlog is now cleared. Everything builds, deploys and
smoke-tests green. The remaining big wins (bet-logging ledger, 7-day free trial, model
fight-week signals) need your call and are in the backlog below. From here I'm keeping the
site monitored and only doing further safe polish.

## ✅ Shipped & verified live (fightvex.com)
- **Programmatic matchup-prediction pages** — `/predict/<a>-vs-<b>` for every bout: Vex AI win %, method split, likely round, real odds + value lean, key factors, "Open in Simulator", FAQ + SportsEvent/FAQPage/Breadcrumb JSON-LD. In sitemap; linked "Full prediction →" from each bout on event pages. ✔ 200 (e.g. /predict/ilia-topuria-vs-justin-gaethje). _(+~80 indexable long-tail pages.)_
- **PostHog funnel events** — `checkout_started`, `signup`/`login` (+identify), `simulation_run`. Dormant unless the PostHog key is set. ✔ deployed.
- **`/api/health`** — freshness probe: events/fighters counts, next event, odds capture age, backtest, `warnings[]`. ✔ returns `{ok:true, warnings:[]}`.
- **OG share cards (matchups)** — branded "A vs B · Vex AI favors X · N%" PNG per `/predict` page. ✔ 200 image/png (66KB).

- **`/predict` hub** — all upcoming AI predictions in one scannable list, CollectionPage/ItemList schema, linked from /events, in sitemap. ✔ 200.
- **"Predictions" top-nav link** — site-wide discoverability of the hub. ✔ live.
- **Fighter → prediction cross-link** — each fighter page booked on an upcoming card shows a "Next fight: vs X · Prediction →" banner to that bout's /predict page. _(Deploying.)_

## ✔ Resolved — Fighter OG share cards (now live)
- Per-fighter `opengraph-image` initially 500'd at runtime. **Root cause:** non-ASCII glyphs (the `·` middot and `★`) aren't in the default `next/og` font when the card is rendered **on-demand** on Vercel — satori throws. The matchup OGs only survived because they were pre-rendered at build (build-env font had the glyphs). **Fix:** use ASCII separators (`-`) and drop `★` in both OG cards. Verified 200 image/png across multiple fighters (incl. the one that failed). _(Lesson logged: keep `next/og` text ASCII-safe.)_

## Next up (safe)
- Final full smoke test of all routes incl. new ones.
- Consider: footer "Predictions" link; home "this week's predictions" strip (home hero is complex — lower priority).

## ⚠ NEEDS YOUR APPROVAL (not done — explained for you)
_(none yet — will fill in as I hit anything requiring keys, money, a new tool, or a product/billing/model decision)_

## 💡 Backlog (bigger, for when you're back)
- Real bet-logging ledger (DB + product calls) — see NEXT_SESSION_PLAN roadmap.
- 7-day free Pro trial (billing change — needs your OK).
- Model: fight-week signals (missed weight), model-vs-closing-line tracking.

- tick 2026-06-08 01:52 UTC: all green (7 routes 200, /api/health ok, no warnings, no high-value safe work pending — no change forced)
- tick 2026-06-08 02:56 UTC: all green; shipped predict-page interlink ("More predictions from this card") for SEO/discovery
- tick 2026-06-08 03:57 UTC: all green (routes 200, /api/health ok, no warnings) — no change forced
- tick 2026-06-08 04:58 UTC: all green — no change forced
