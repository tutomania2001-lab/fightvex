# Live odds time-series — setup (≈5 min, free)

The Line Movement Tracker already works with two real snapshots (opening → current).
To make it a **live, self-updating time-series**, switch on the scheduled feed below.
Until you do, the site falls back gracefully — nothing breaks.

## 1. Get a free The Odds API key
- Sign up at <https://the-odds-api.com> (free tier = 500 requests/month).
- Copy your API key.

## 2. Add a free KV store (Vercel KV / Upstash Redis)
- Vercel dashboard → your project → **Storage** → create **KV** (Upstash Redis, free "Hobby" plan).
- Vercel auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to the project's env vars.

## 3. Set the remaining env vars (Vercel → Settings → Environment Variables)
```
THE_ODDS_API_KEY = <your the-odds-api.com key>
CRON_SECRET      = <any long random string>   # protects the cron route
```
(`KV_REST_API_URL` / `KV_REST_API_TOKEN` were added automatically in step 2.)

## 4. Redeploy
`vercel --prod`. The cron in `vercel.json` runs daily and appends one real
snapshot per bout. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

## Verify
- Trigger once manually: `https://fightvex.com/api/cron/odds?key=<CRON_SECRET>`
  → returns `{ ok: true, matched, written }`.
- The betting page shows a green **Live** badge and the sparklines grow over time.

## More frequent than daily (still free, optional)
Free Vercel (Hobby) cron runs **once/day**. For every-few-hours updates without
Vercel Pro, leave the cron off and instead point a free external scheduler
(e.g. <https://cron-job.org>) at:
```
https://fightvex.com/api/cron/odds?key=<CRON_SECRET>     every 4h
```

## Notes
- The route matches The Odds API events to our bouts by fighter name and stores a
  consensus (decimal-averaged across books) moneyline per fighter.
- No env vars set → `kvEnabled`/`oddsApiEnabled` are false, the cron route returns
  `{ ok:false, reason:"not configured" }`, and the tracker stays on open→current.
- All real data; the only modelled figure on the page remains the Vex AI probability.
