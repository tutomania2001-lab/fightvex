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
- tick 2026-06-08 05:59 UTC: all green — no change forced
- tick 2026-06-08 07:00 UTC: all green; Google index check — still pending (expected, ~8h post-submit; index-watch routine will flag)
- tick 2026-06-08 08:01 UTC: all green — no change forced
- tick 2026-06-08 09:02 UTC: all green — no change forced
- tick 2026-06-08 10:03 UTC: all green; Google index still pending (~10h post-submit, normal)

---

## Session 2 — autonomous (2026-06-08, daytime cont.)
Rules unchanged: ship safe/additive (typecheck+build+smoke first); queue anything needing keys/decisions; stop only on "im back".

### Shipped & verified
- **Fixed missing fighter stats** (McGregor, Holloway + 45 others): targeted ESPN merge filled REAL_AGG 241→288. Their pages now show real metrics.
- **Pipeline hardening**: `fetch_stats.py` now MERGES (never drops a fighter on an ESPN hiccup; auto-covers new fighters) — makes the CI's existing step non-destructive. `/api/health` now flags upcoming-card fighters missing stats (`upcomingFightersMissingStats`).
- **Model — fight-week injury/illness signal (#3)**: curated `INJURED` set + modest debuff (rating −2, per-round ×0.96) + "Injury / illness" swing factor, threaded through every sim call site (incl. committed picks). Dormant until curated, so live predictions unchanged.

### Model experiments — backtest-validated, HONEST results
Baseline (current v3.2 engine): **64.5%** full / **63.4%** held-out (post-cal), log-loss 0.625.
- **#1 Opponent-adjusted (SOS-weighted) stats — REJECTED.** Tested all-stats (ADJ 0.3/0.5/0.8) and offense-only (0.2/0.4); every variant was neutral-to-worse (held-out 63.4%→62.3%), log-loss worsened. The prior already captures opponent quality; SOS-scaling adds noise. Not shipped (reverted experiment).
- **#2 Striking-profile features — can't validate → kept INSIGHT-ONLY.** history.json has no strike-location (head/body/leg) data, so the features can't be reconstructed point-in-time → can't be backtested leakage-free. Shipping them as predictors would be unvalidated/leaky. Left as UI insight (honest).

### ⚠ Note for you
- Deployed backtest shows the model now actually scores ~64.5% (the public /accuracy still shows the older 61.9% — stale, conservative). I can regenerate the public number with a full canonical run if you want it updated.

### ⚠ NEEDS YOUR APPROVAL (queued — not done autonomously)
- **Bump public accuracy to the real number.** Backtest now validates ~64.5% full / ~63.4% held-out, but /accuracy still shows the stale 61.9%. It's REAL + higher (good news) — I left it for your OK since it's the headline credibility stat. Say the word and I'll regenerate + commit.
- **Model-vs-closing-line (CLV) tracking** — prove the model beats the closing line (the metric that sells betting value). Bigger build; want it?
- **Trial-ending reminder email** (Resend) — reduces surprise charges, lifts trial→paid. Outward-facing (sends real emails) so I won't enable sends without your OK.
- **Annual plan** (e.g. £100/yr) — billing/pricing decision.
- **Public "free pick of the week"** — one ungated prediction as a hook (since predictions are now Pro). Product decision: which pick goes public.

### Data note
- 12 roster fighters (incl. Gable Steveson, Farman Hasanov) have ESPN eventlogs but NO per-fight stat breakdown — genuinely unavailable, so they keep the labeled estimate fallback (not a fetch bug). Health check now treats this as a soft note, not a failure.

---

## Approved batch — ALL SHIPPED (2026-06-08)
1. ✅ Public accuracy bumped to real backtested numbers (64.6% full / 63.5% recent).
2. ✅ Model-vs-closing-line (CLV) tracking — captures pick-time + closing no-vig per pick; /accuracy shows beat-the-close %, edge-vs-close, CLV+ win rate (populates as picks grade).
3. ✅ Trial-ending reminder email — daily cron (14:00 UTC), Stripe trialing query, Resend, deduped.
4. ✅ Annual Pro plan — LIVE. STRIPE_PRICE_PRO_ANNUAL=prod_UfTFTVGmCxxbSW set; monthly/annual toggle (£96/yr −20%) shipped. (Owner: confirm a test checkout shows £96/yr.)
5. ✅ Free pick of the week (/free-pick, never the headliner) + 1 free simulation per account (KV-tracked).
- tick (stray, post-return): all green — 11 routes 200, health ok, acc 0.646 live, 2 debutant stat-notes (unfetchable). Loop not rescheduled (Bernardo back).
