# FightVex — Next-Session Plan

_Authored 2026-06-07 after a full codebase map (model, product, data/infra). Grounded in the actual code — file paths are clickable references. Ordered by leverage, with an effort/impact table at the end._

> **North star.** FightVex's edge is *credible, transparent prediction* + *real market data*, sold as a premium tool. So the three things that actually move the business: (1) the model being **right and honestly calibrated**, (2) people being able to **pay** and **come back**, (3) the data being **fresh and not silently broken**. Everything below ladders up to one of those.

---

## PART A — Prediction model (highest-leverage first)

The backtest sits at ~61–62% accuracy, well-calibrated (ECE ~2%). Per prior testing, naive additions (raw Elo, behavioral/style features, per-round modelling) were already A/B-tested and **rejected** — do not re-litigate those. The real wins now are **fixing inputs that are currently broken or noisy**, **calibration**, and **method-of-victory** — not chasing the box-score accuracy ceiling.

### A1. Replace the RANDOM layoff input with real layoff  ⭐ biggest correctness bug
- **Today:** `layoffMonths = clamp(2 + floor(rng()*12), 2, 16)` — a *seeded random number*, in [src/lib/data/fighters.ts:246](src/lib/data/fighters.ts#L246). It then drives a real rating penalty (`-0.35/month` over 9) and risk flags. The model is currently penalising fighters based on **noise**.
- **Fix:** derive real layoff from each fighter's last fight date. The history crawlers already pull dated bouts (`scripts/crawl-rounds-*.mjs`, `backtest/history.json`); the backtest even computes *real* layoff point-in-time. Surface that into production `fighters.ts` (a `lastFightDate` per fighter in a generated file), compute `monthsSince(now)`.
- **Validate:** re-run `scripts/backtest.mjs` — the backtest already uses real layoff, so prod will finally match the backtested engine. Expect small accuracy gain and a meaningful honesty gain (no more phantom layoff flags on active fighters).
- **Effort:** M. **Impact:** High (correctness + removes a credibility risk if anyone notices a wrong "X-month layoff" flag).

### A2. Strength-of-schedule as the real "Competition" signal
- **Today:** Competition/`oppQuality` is held at its prior weight (0.131) because *historical rankings can't be reconstructed* — see weights in [src/lib/sim.ts:80](src/lib/sim.ts#L80) and `oppQuality` in [src/lib/data/fighters.ts:245](src/lib/data/fighters.ts#L245). It's a static guess from current rank/champ status.
- **Fix:** SOS is reconstructable leakage-free (unlike rankings): for each fighter, average their *opponents' pre-fight win rate / finish resistance* over recent bouts. This is a genuine competition measure that the backtest **can** score (rankings couldn't). Add it as a generated feature; let the backtest decide its weight.
- **Why it's not the rejected "Elo":** Elo is a single recursive rating; SOS is a direct, interpretable box-score-style aggregate that fits the transparent model's philosophy and is fully point-in-time.
- **Effort:** M–L. **Impact:** Med (could lift the one signal that's currently frozen).

### A3. Weight-class-specific finish hazards (method-of-victory accuracy)
- **Today:** `BASE_KO = 3.8`, `BASE_SUB = 17.2` are global constants ([src/lib/sim.ts:108](src/lib/sim.ts#L108)), tuned to the *overall* ~49–55% finish rate. But heavyweights finish ~60%+ and flyweights ~30% — method accuracy (~60% live) lags winner accuracy.
- **Fix:** scale base hazards by weight class (a small multiplier table, fit from the backtest's per-division finish rates). Keep the dominance/damage gating that already fixed R1-KO-spam.
- **Validate:** backtest reports finish-rate-by-bucket; check method accuracy improves without hurting log-loss.
- **Effort:** S–M. **Impact:** Med (method picks are a visible product surface on /simulator and /accuracy).

### A4. Recalibrate on the LIVE graded record (not just backtest)
- **Today:** calibration (Platt a/b) is fit on historical backtest; the live `/accuracy` record grades real picks via [src/lib/predictions.ts](src/lib/predictions.ts) but doesn't feed back into calibration.
- **Fix:** once N graded live picks exist (say ≥150), refit/aud­it calibration against them; if backtest and live diverge, surface it. Cheap honesty win and a great marketing line ("calibrated against our own public record").
- **Effort:** S (once enough picks). **Impact:** Med, compounding.

### A5. Wire up or delete the dormant `striking.generated.ts`
- **Today:** the largest generated file (~384 KB), only consumed by the **fighter detail UI**, never by the model — [src/app/fighters/[slug]/page.tsx](src/app/fighters/[slug]/page.tsx). It's per-fighter striking detail (target breakdown, position, etc.).
- **Decide:** either (a) engineer 2–3 leakage-safe features from it (e.g., head-strike share, distance vs clinch tendency) and let the backtest test them, or (b) stop generating it if it stays UI-only. Don't leave 384 KB of half-wired signal.
- **Effort:** M (if wiring). **Impact:** Low–Med, exploratory.

### A6. Minor model polish (do only if A1–A4 land)
- **Age curve:** linear peak-29 in Physical subscore — try a plateau (27–32) + post-33 decline curve, fit on backtest. Low weight, low payoff.
- **Ensemble weight:** the transparent/GBM blend is hard-coded 50/50 ([src/lib/sim.ts:368](src/lib/sim.ts#L368)). Grid-search 0.3–0.7 on the *current larger* backtest set; the optimum may have shifted.
- **Stance/reach interaction** in the transparent model (it's GBM-only today). Marginal.

> **Don't:** re-add raw Elo, behavioral/style clusters, or per-round modelling as predictors — already tested & rejected. Per-round stays insight-only.

---

## PART B — Product, monetization & growth (the "success outcome")

### B1. Make payment actually work  ⭐ #1 revenue blocker
- **Today:** Stripe code is complete (checkout/webhook/portal in `src/app/api/stripe/*`, `src/lib/stripe.ts`) but **no live keys are set** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_PRO/ELITE` are absent, so it's not earning.
- **Do:** create the products/prices in Stripe, set the env vars in Vercel, register the webhook endpoint, run one real test purchase end-to-end (checkout → webhook flips plan → portal cancels). This is an owner task but I can verify the wiring and write a checklist.
- **Effort:** S (config) + verify. **Impact:** Highest (zero revenue is possible without it).

### B2. Add privacy-respecting analytics  ⭐ you can't improve what you can't measure
- **Today:** **no analytics at all** (the "analytics" mentions in pages are policy copy, not scripts). No funnel, no conversion, no idea what converts.
- **Do:** add Vercel Web Analytics or Plausible (CSP-friendly, no cookie banner). Instrument the money path: pricing view → checkout start → purchase, plus sim-run and signup. Keeps the "privacy-respecting analytics" claim in [/legal/privacy](src/app/legal/[doc]/page.tsx) honest.
- **Effort:** S. **Impact:** High (turns guesses into decisions).

### B3. Retention loop: watchlist alerts + email
- **Today:** free watchlists exist; **alerts are advertised but not wired** (no email infra). Bankroll tracker is stubbed ("activates once accounts launch") on [/dashboard](src/app/dashboard/page.tsx).
- **Do:** pick a transactional email provider (Resend/Postmark), send "your watched fighter is on this week's card" + "the line moved" alerts off the existing odds/predictions cron. This is the single biggest *retention* lever for a subscription product.
- **Effort:** M. **Impact:** High (retention → LTV).

### B4. Programmatic SEO: matchup-prediction pages
- **Today:** strong SEO base (sitemap, JSON-LD, 44 static + dynamic fighter/event routes). But the highest-intent long-tail query — **"X vs Y prediction"** — has no dedicated landing page.
- **Do:** generate `/predictions/[a]-vs-[b]` (or reuse `/compare`) as indexable pages with the Vex AI read, method split, and odds, with `SportsEvent`/FAQ schema. This is the organic-acquisition engine for a prediction site.
- **Effort:** M. **Impact:** High over time (compounding organic traffic).

### B5. Deliver or drop the advertised-but-missing tier features
- Pricing promises **API-lite**, **B2B/analyst dashboard**, **data licensing**, **embeddable widgets** — none exist in code. Either build a thin v1 (API-lite read endpoint is the easiest and most defensible) or trim the copy so it isn't overpromising before launch.
- **Effort:** varies. **Impact:** Med (trust + a real B2B wedge).

### B6. Finish the account surface
- Bankroll/CLV tracker (Elite), watchlist UI polish, and the `/api/account/insights`/`activity` endpoints that exist but aren't surfaced. Closing these makes Pro/Elite feel worth the price.
- **Effort:** M. **Impact:** Med (reduces churn, justifies tiers).

---

## PART C — Reliability, data freshness & automation

> The map turned up a recurring theme: **everything fails silently.** For a credibility-based product, a stale card or a dead odds feed is a brand risk.

### C1. Automate `stats.generated.ts` refresh  ⭐ stale stats = stale predictions
- **Today:** real fight stats (`fetch_stats.py`) are **only refreshed manually**. `espn.generated.ts` auto-refreshes on build, but the *stats that feed the model* don't — so predictions can run on weeks-old aggregates.
- **Do:** fold a stats refresh into the pre-event flow (or a weekly cron), or port `fetch_stats.py` to a Node script so it runs in `prebuild` like `fetch-espn.mjs`. (Python isn't available on Vercel — that's why bodies/headshots are pre-committed; stats need the same treatment or a Node port.)
- **Effort:** M. **Impact:** High (directly affects live prediction quality).

### C2. Cron failure + data-freshness alerting
- **Today:** odds cron (12:00 UTC) and predictions cron (13:00 UTC) in `vercel.json` **fail silently** — KV down, Odds-API down, or a fighter-name mismatch produces no alert.
- **Do:** on cron failure or zero-matches, ping a webhook (Discord/Slack/email). Add a tiny `/api/health` that reports last-successful-cron timestamps and data file ages.
- **Effort:** S. **Impact:** Med–High (you'll *know* before users do).

### C3. Turn on the live odds feed
- **Today:** `THE_ODDS_API_KEY` and `CRON_SECRET` aren't set, so the Line Movement Tracker runs on a 2-point static seed (`odds.generated.ts`). Setup is documented in [docs/LIVE_ODDS_SETUP.md](docs/LIVE_ODDS_SETUP.md) (~5 min, free tier).
- **Do:** set the two env vars in Vercel; verify a snapshot lands in KV. (This is partly why the betting board felt static.)
- **Effort:** S. **Impact:** Med (a headline feature becomes truly live).

### C4. Minimal test safety net
- **Today:** no unit/integration tests; validation is Playwright screenshots (`audit.mjs`, `smoke.mjs`, `a11y.mjs`, `csp.mjs`).
- **Do:** add a handful of pure-function tests around the model (`statsFromAgg`, `simulate` determinism for a fixed seed, calibration math) and a smoke test that asserts `nextEvent()` is always future-dated. These are the parts where a silent regression would be worst.
- **Effort:** S–M. **Impact:** Med (protects the crown jewels).

### C5. Housekeeping
- `scripts/glove_icons.py` has a **hardcoded Windows path** (`D:\...\Assets`) — parameterize it so it's reproducible.
- Auto-rerun `backtest.mjs`/GBM training on a cadence (or document the cadence) so the published accuracy and the live engine don't drift.
- Legal pages are flagged "Demonstration copy" — get them reviewed before real payments go live.

---

## PART D — Quick wins (do first, <30 min each)
1. **Turn on analytics (B2)** — one script + Vercel toggle.
2. **Turn on live odds (C3)** — two env vars.
3. **Cron alerting (C2)** — a webhook ping in the catch blocks.
4. **`/api/health` freshness endpoint (C2)** — read file mtimes + last cron KV timestamps.
5. **Fix `glove_icons.py` path (C5).**

---

## Prioritized roadmap (impact × effort)

| # | Item | Impact | Effort | Why now |
|---|------|--------|--------|---------|
| A1 | Real layoff (kill the random) | High | M | Model is using noise as an input today |
| B1 | Stripe live keys + test purchase | Highest | S+verify | No revenue without it |
| B2 | Analytics | High | S | Can't optimize blind |
| C1 | Auto-refresh model stats | High | M | Stale stats degrade live picks |
| A3 | Weight-class finish hazards | Med | S–M | Lifts method accuracy (visible) |
| C3 | Live odds on | Med | S | Headline feature is currently static |
| C2 | Cron/freshness alerting | Med-High | S | Stop silent breakage |
| B3 | Watchlist email alerts | High | M | #1 retention lever |
| A2 | Strength-of-schedule | Med | M | Unfreezes the Competition signal |
| B4 | Matchup-prediction SEO pages | High (slow) | M | Compounding organic growth |
| A4 | Recalibrate on live record | Med | S | Honesty + marketing |
| C4 | Model unit tests | Med | S–M | Protect the engine |
| A5 | Wire/cut striking.generated | Low-Med | M | Resolve 384 KB of dead signal |
| B5/B6 | Tier features / account polish | Med | varies | Trust + churn |

**Suggested first session:** D (all quick wins) → A1 → A3 → C1. That ships honesty + revenue plumbing + fresher data in one go, then improves the model where it's currently wrong rather than chasing the ceiling.

---

### What we shipped this session (2026-06-07)
- Home hero now shows **Topuria vs Gaethje** (split the supplied transparent asset into `public/ui/event-topuria.png` / `event-gaethje.png`; swapped `EVENT_LAYERS` in [HeroFightAnimation.tsx](src/components/site/HeroFightAnimation.tsx#L265)).
- Hovering hero stats now derive from the real Topuria/Gaethje featured matchup (automatic once `nextEvent()` rolled by date).
- Fixed the **Edge Desk** showing a completed card: [betting/page.tsx](src/app/betting/page.tsx) now uses `upcomingEvents()` (date-based rolling) instead of `allEvents()`.
- **Auto-refresh CI**: [.github/workflows/refresh.yml](.github/workflows/refresh.yml) + [scripts/should-refresh.mjs](scripts/should-refresh.mjs) — every 30 min, refresh ESPN data/stats/assets and deploy to prod only when a card just finished (start +3–9h) or the daily 12:00 UTC heartbeat. Solves "the site didn't roll to the next event on its own." (Needs: GitHub repo + `VERCEL_TOKEN` secret.)

---

## Stack & infrastructure decisions (2026-06-07)

Adopting a managed-SaaS stack. Key rulings:

- **Forget Azure.** These are independent SaaS, each on its own cloud — they are *not* hosted "in Azure." Self-hosting all of this in Azure would be a heavier, different architecture with no benefit at this scale.
- **One auth system, not three.** Current custom auth (scrypt + opaque sessions on Upstash) works. Do **not** run it alongside Clerk *and* Supabase Auth. Decision pending: (A) Clerk now, (B) Supabase + Supabase Auth, or (C) keep custom auth for now and migrate later. The additive services below don't depend on this.
- **Supabase vs Upstash = distinct roles.** If/when Supabase (Postgres) is adopted: durable/relational/queryable data (bet history, bankroll, CLV). Upstash (Redis): cache, rate-limit, sessions, ephemeral KV. Never duplicate data across both.
- **Drop Pinecone for now.** No embedding/RAG feature exists. If AI search/chat is built later, start with **pgvector in Supabase**; Pinecone only at real scale.
- **Solid as-is:** Vercel (host) + Namecheap (registrar) + Cloudflare (DNS, grey-cloud/DNS-only to Vercel) + GitHub (VCS) + Stripe (payments) + Upstash (Redis).

**Adoption tiers**
- **Now (additive, low-risk, high-value — independent of the auth decision):** Stripe **live keys** (B1), **PostHog** analytics (B2), **Sentry** error tracking (C2-adjacent), **Resend** email for watchlist/line-move alerts (B3), GitHub + auto-refresh CI.
- **Deliberate, when needed:** Supabase (Postgres) once bet/bankroll data needs SQL — and pick **its** auth, or Clerk if Supabase is skipped.
- **Cut:** Pinecone, Azure.

Each service is gated on the owner creating the account + providing keys (env vars in Vercel; secrets in GitHub for CI).
