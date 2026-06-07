// ============================================================
// FightVex — PILOT crawler: UFCStats per-fight significant-strike DETAIL
// (target head/body/leg + position distance/clinch/ground) that ESPN's feed
// doesn't carry. Uses Playwright to render past UFCStats' JS bot-challenge.
// Pilot scope: a handful of recent events to (1) prove crawl+parse works and
// (2) test whether this detail adds real signal. Run: node scripts/crawl-rounds-pilot.mjs [nEvents]
// ============================================================
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "backtest", "ufcstats-pilot.json");
const N_EVENTS = Number(process.argv[2]) || 14;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ userAgent: UA });
const page = await ctx.newPage();
const go = async (url) => { await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }); await page.waitForTimeout(1200); };

// 1) recent completed events
await go("http://ufcstats.com/statistics/events/completed?page=all");
const events = await page.$$eval("tr.b-statistics__table-row a.b-link", (as) =>
  as.map((a) => ({ url: a.href, name: a.textContent.trim() })).filter((e) => /event-details/.test(e.url)));
console.log(`events listed: ${events.length}; crawling ${N_EVENTS} most recent`);

// parse one fight-details page into per-fighter detail (fight totals)
async function parseFight(url) {
  await go(url);
  return await page.evaluate(() => {
    const persons = [...document.querySelectorAll(".b-fight-details__person")].map((p) => ({
      name: p.querySelector(".b-fight-details__person-link, .b-link")?.textContent.trim() || "",
      outcome: p.querySelector(".b-fight-details__person-status")?.textContent.trim() || "",
    }));
    const num = (s) => { const m = (s || "").match(/-?\d+/); return m ? +m[0] : 0; };
    const landOf = (s) => num((s || "").split(" of ")[0]);
    const tables = [...document.querySelectorAll("table")].map((tbl) => {
      const heads = [...tbl.querySelectorAll("thead th")].map((th) => th.textContent.trim());
      const firstRow = tbl.querySelector("tbody tr");
      if (!firstRow) return null;
      const cols = [...firstRow.querySelectorAll("td")].map((td) => [...td.querySelectorAll("p")].map((p) => p.textContent.trim()));
      return { heads, cols };
    }).filter(Boolean);
    const findT = (kw) => tables.find((t) => kw.every((k) => t.heads.some((h) => h.toLowerCase().includes(k))));
    const totals = findT(["kd", "td", "ctrl"]);
    const sig = findT(["head", "body", "leg"]);
    const out = [0, 1].map((i) => ({ idx: i }));
    if (totals) {
      const ci = (kw) => totals.heads.findIndex((h) => h.toLowerCase().includes(kw));
      for (const i of [0, 1]) {
        out[i].kd = num(totals.cols[ci("kd")]?.[i]);
        out[i].sigL = landOf(totals.cols[ci("sig. str.")]?.[i] ?? totals.cols[2]?.[i]);
        out[i].td = landOf(totals.cols[ci("td")]?.[i]);
        out[i].subAtt = num(totals.cols[ci("sub")]?.[i]);
        const ctrl = totals.cols[ci("ctrl")]?.[i] || "0:00"; const [mm, ss] = ctrl.split(":").map(Number); out[i].ctrlSec = (mm || 0) * 60 + (ss || 0);
      }
    }
    if (sig) {
      const ci = (kw) => sig.heads.findIndex((h) => h.toLowerCase() === kw || h.toLowerCase().includes(kw));
      for (const i of [0, 1]) {
        out[i].head = landOf(sig.cols[ci("head")]?.[i]);
        out[i].body = landOf(sig.cols[ci("body")]?.[i]);
        out[i].leg = landOf(sig.cols[ci("leg")]?.[i]);
        out[i].distance = landOf(sig.cols[ci("distance")]?.[i]);
        out[i].clinch = landOf(sig.cols[ci("clinch")]?.[i]);
        out[i].ground = landOf(sig.cols[ci("ground")]?.[i]);
      }
    }
    return { persons, fighters: out };
  });
}

const out = [];
for (const ev of events.slice(0, N_EVENTS)) {
  try {
    await go(ev.url);
    const date = await page.$eval(".b-list__box-list-item", (el) => el.textContent.replace(/Date:/i, "").trim()).catch(() => "");
    const fightUrls = await page.$$eval("tr.b-fight-details__table-row[data-link], tr.js-fight-details-click", (rows) => rows.map((r) => r.getAttribute("data-link")).filter(Boolean));
    console.log(`  ${ev.name} (${date}) — ${fightUrls.length} fights`);
    for (const fu of fightUrls) {
      try {
        const f = await parseFight(fu);
        if (f.persons.length === 2 && f.fighters[0].head != null) {
          out.push({ event: ev.name, date, url: fu,
            a: { name: f.persons[0].name, win: /w/i.test(f.persons[0].outcome), ...f.fighters[0] },
            b: { name: f.persons[1].name, win: /w/i.test(f.persons[1].outcome), ...f.fighters[1] } });
        }
      } catch (e) { /* skip fight */ }
    }
    writeFileSync(OUT, JSON.stringify({ generatedAt: "pilot", nFights: out.length, fights: out }));
  } catch (e) { console.log("  event err:", e.message); }
}
await browser.close();
console.log(`\nDONE: ${out.length} fights with per-strike detail → ${OUT}`);
if (out[0]) console.log("sample:", JSON.stringify(out[0], null, 1).slice(0, 500));
