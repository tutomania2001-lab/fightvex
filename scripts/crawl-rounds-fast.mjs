// ============================================================
// FightVex — FAST parallel UFCStats detail crawl. Clears the JS bot-challenge
// ONCE with Playwright to obtain session cookies, then fetches+parses pages with
// concurrent plain HTTP (cheerio) — ~10x faster than rendering each page.
// Bounded concurrency + jitter to stay under the bot-wall; auto-refreshes the
// cookie via Playwright if the challenge re-triggers. Resumable. RESUMES from
// ufcstats-detail.json + the pilot file. Run: node scripts/crawl-rounds-fast.mjs
// ============================================================
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "backtest", "ufcstats-detail.json");
const PILOT = join(ROOT, "backtest", "ufcstats-pilot.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CONC = 6;                 // concurrent fetches (bounded to stay under the bot-wall)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// resume
const byUrl = new Map();
for (const f of [OUT, PILOT]) if (existsSync(f)) { try { for (const x of (JSON.parse(readFileSync(f, "utf8")).fights || [])) if (x.url) byUrl.set(x.url, x); } catch {} }
console.log(`resuming with ${byUrl.size} fights`);
const save = () => writeFileSync(OUT, JSON.stringify({ generatedAt: "fast", nFights: byUrl.size, fights: [...byUrl.values()] }));

// ---- challenge clearance via Playwright, reused as a cookie header ----
let cookie = "";
async function refreshCookie() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ userAgent: UA });
  const pg = await ctx.newPage();
  await pg.goto("http://ufcstats.com/statistics/events/completed?page=all", { waitUntil: "networkidle", timeout: 45000 });
  await pg.waitForTimeout(1500);
  const html = await pg.content();
  cookie = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  await b.close();
  return html;
}
async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Cookie": cookie } });
      const t = await r.text();
      if (/Checking your browser/i.test(t)) { console.log("  challenge re-triggered → refreshing cookie"); await refreshCookie(); await sleep(800); continue; }
      return t;
    } catch { await sleep(700 * (i + 1)); }
  }
  return null;
}

// ---- parse one fight page (cheerio) ----
function parseFight(html) {
  const $ = cheerio.load(html);
  const persons = $(".b-fight-details__person").map((_, p) => ({
    name: $(p).find(".b-fight-details__person-link, .b-link").first().text().trim(),
    outcome: $(p).find(".b-fight-details__person-status").first().text().trim(),
  })).get();
  const num = (s) => { const m = (s || "").match(/-?\d+/); return m ? +m[0] : 0; };
  const landOf = (s) => num((s || "").split(" of ")[0]);
  const tables = $("table").map((_, tbl) => {
    const heads = $(tbl).find("thead th").map((__, th) => $(th).text().trim()).get();
    const row = $(tbl).find("tbody tr").first();
    if (!row.length) return null;
    const cols = row.find("td").map((__, td) => $(td).find("p").map((___, p) => $(p).text().trim()).get()).get();
    return { heads, cols };
  }).get().filter(Boolean);
  // OVERALL tables only — exclude per-round tables (their headers contain "Round
  // 1/2/3..."), otherwise we'd grab a single round instead of the fight total.
  const findT = (kw) => tables.find((t) => !t.heads.some((h) => /round/i.test(h)) && kw.every((k) => t.heads.some((h) => h.toLowerCase().includes(k))));
  const totals = findT(["kd", "td", "ctrl"]), sig = findT(["head", "body", "leg"]);
  if (!sig || persons.length !== 2) return null;
  const out = [0, 1].map(() => ({}));
  if (totals) { const ci = (k) => totals.heads.findIndex((h) => h.toLowerCase().includes(k));
    for (const i of [0, 1]) { out[i].kd = num(totals.cols[ci("kd")]?.[i]); out[i].sigL = landOf(totals.cols[ci("sig. str.")]?.[i] ?? totals.cols[2]?.[i]); out[i].td = landOf(totals.cols[ci("td")]?.[i]); out[i].subAtt = num(totals.cols[ci("sub")]?.[i]); const c = totals.cols[ci("ctrl")]?.[i] || "0:00"; const [m, s] = c.split(":").map(Number); out[i].ctrlSec = (m || 0) * 60 + (s || 0); } }
  const ci = (k) => sig.heads.findIndex((h) => h.toLowerCase() === k || h.toLowerCase().includes(k));
  for (const i of [0, 1]) for (const f of ["head", "body", "leg", "distance", "clinch", "ground"]) out[i][f] = landOf(sig.cols[ci(f)]?.[i]);
  return { persons, fighters: out };
}

// ---- mapped concurrency ----
async function pool(items, n, fn) {
  const it = items[Symbol.iterator](); const work = [];
  for (let k = 0; k < n; k++) work.push((async () => { for (let nx = it.next(); !nx.done; nx = it.next()) await fn(nx.value); })());
  await Promise.all(work);
}

// 1) cookie + event list
const listHtml = await refreshCookie();
const $list = cheerio.load(listHtml);
const events = $list("tr.b-statistics__table-row a.b-link").map((_, a) => ({ url: $list(a).attr("href"), name: $list(a).text().trim() })).get().filter((e) => /event-details/.test(e.url || ""));
console.log(`events: ${events.length}, concurrency ${CONC}`);

// 2) per event: get date + fight urls, then crawl missing fights in parallel
let done = 0, added = 0, sinceSave = 0;
for (const ev of events) {
  const eh = await get(ev.url); if (!eh) { console.log(`  [skip] ${ev.name}`); continue; }
  const $e = cheerio.load(eh);
  const date = $e(".b-list__box-list-item").first().text().replace(/Date:/i, "").trim();
  const fightUrls = $e("tr.b-fight-details__table-row[data-link], tr.js-fight-details-click").map((_, r) => $e(r).attr("data-link")).get().filter(Boolean);
  const todo = fightUrls.filter((u) => !byUrl.has(u));
  done++;
  process.stdout.write(`[${done}/${events.length}] ${ev.name} (${date}) ${todo.length}/${fightUrls.length} new\n`);
  await pool(todo, CONC, async (fu) => {
    await sleep(Math.floor(Math.random() * 150));
    const h = await get(fu); if (!h) return;
    const f = parseFight(h);
    if (f && f.fighters[0].head != null) {
      byUrl.set(fu, { event: ev.name, date, url: fu,
        a: { name: f.persons[0].name, win: /w/i.test(f.persons[0].outcome), ...f.fighters[0] },
        b: { name: f.persons[1].name, win: /w/i.test(f.persons[1].outcome), ...f.fighters[1] } });
      added++; sinceSave++;
    }
  });
  if (sinceSave >= 20) { save(); sinceSave = 0; }
}
save();
console.log(`\nDONE: ${added} added this run, total ${byUrl.size} → ${OUT}`);
