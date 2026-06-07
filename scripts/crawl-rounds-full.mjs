// ============================================================
// FightVex — FULL UFCStats per-fight DETAIL crawl (1993–2026), RESUMABLE.
// Pulls significant-strike target (head/body/leg) + position (distance/clinch/
// ground) + KD/TD/sub/control for every UFC fight UFCStats has. Uses Playwright
// to render past the JS bot-challenge. Resumes from prior output + the pilot
// file, skipping fights already captured. Run: node scripts/crawl-rounds-full.mjs
// ============================================================
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "backtest", "ufcstats-detail.json");
const PILOT = join(ROOT, "backtest", "ufcstats-pilot.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

// ---- resume: seed from any prior output + the pilot file, dedup by fight url ----
const byUrl = new Map();
for (const file of [OUT, PILOT]) {
  if (existsSync(file)) { try { for (const f of (JSON.parse(readFileSync(file, "utf8")).fights || [])) if (f.url) byUrl.set(f.url, f); } catch { /* ignore */ } }
}
console.log(`resuming with ${byUrl.size} fights already captured`);
const save = () => writeFileSync(OUT, JSON.stringify({ generatedAt: "full", nFights: byUrl.size, fights: [...byUrl.values()] }));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ userAgent: UA });
const page = await ctx.newPage();
async function go(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }); await page.waitForTimeout(600); return true; }
    catch { await page.waitForTimeout(1500); }
  }
  return false;
}

await go("http://ufcstats.com/statistics/events/completed?page=all");
const events = await page.$$eval("tr.b-statistics__table-row a.b-link", (as) =>
  as.map((a) => ({ url: a.href, name: a.textContent.trim() })).filter((e) => /event-details/.test(e.url)));
console.log(`events to scan: ${events.length}`);

async function parseFight(url) {
  if (!(await go(url))) return null;
  return await page.evaluate(() => {
    const persons = [...document.querySelectorAll(".b-fight-details__person")].map((p) => ({
      name: p.querySelector(".b-fight-details__person-link, .b-link")?.textContent.trim() || "",
      outcome: p.querySelector(".b-fight-details__person-status")?.textContent.trim() || "",
    }));
    const num = (s) => { const m = (s || "").match(/-?\d+/); return m ? +m[0] : 0; };
    const landOf = (s) => num((s || "").split(" of ")[0]);
    const tables = [...document.querySelectorAll("table")].map((tbl) => {
      const heads = [...tbl.querySelectorAll("thead th")].map((th) => th.textContent.trim());
      const firstRow = tbl.querySelector("tbody tr"); if (!firstRow) return null;
      const cols = [...firstRow.querySelectorAll("td")].map((td) => [...td.querySelectorAll("p")].map((p) => p.textContent.trim()));
      return { heads, cols };
    }).filter(Boolean);
    const findT = (kw) => tables.find((t) => kw.every((k) => t.heads.some((h) => h.toLowerCase().includes(k))));
    const totals = findT(["kd", "td", "ctrl"]), sig = findT(["head", "body", "leg"]);
    const out = [0, 1].map(() => ({}));
    if (totals) { const ci = (k) => totals.heads.findIndex((h) => h.toLowerCase().includes(k));
      for (const i of [0, 1]) { out[i].kd = num(totals.cols[ci("kd")]?.[i]); out[i].sigL = landOf(totals.cols[ci("sig. str.")]?.[i] ?? totals.cols[2]?.[i]); out[i].td = landOf(totals.cols[ci("td")]?.[i]); out[i].subAtt = num(totals.cols[ci("sub")]?.[i]); const c = totals.cols[ci("ctrl")]?.[i] || "0:00"; const [m, s] = c.split(":").map(Number); out[i].ctrlSec = (m || 0) * 60 + (s || 0); } }
    if (sig) { const ci = (k) => sig.heads.findIndex((h) => h.toLowerCase() === k || h.toLowerCase().includes(k));
      for (const i of [0, 1]) { out[i].head = landOf(sig.cols[ci("head")]?.[i]); out[i].body = landOf(sig.cols[ci("body")]?.[i]); out[i].leg = landOf(sig.cols[ci("leg")]?.[i]); out[i].distance = landOf(sig.cols[ci("distance")]?.[i]); out[i].clinch = landOf(sig.cols[ci("clinch")]?.[i]); out[i].ground = landOf(sig.cols[ci("ground")]?.[i]); } }
    return { persons, fighters: out };
  });
}

let scanned = 0, added = 0, sinceSave = 0;
for (const ev of events) {
  scanned++;
  if (!(await go(ev.url))) { console.log(`  [skip event] ${ev.name}`); continue; }
  const date = await page.$eval(".b-list__box-list-item", (el) => el.textContent.replace(/Date:/i, "").trim()).catch(() => "");
  const fightUrls = await page.$$eval("tr.b-fight-details__table-row[data-link], tr.js-fight-details-click", (rows) => rows.map((r) => r.getAttribute("data-link")).filter(Boolean));
  const todo = fightUrls.filter((u) => !byUrl.has(u));
  console.log(`  [${scanned}/${events.length}] ${ev.name} (${date}) — ${fightUrls.length} fights, ${todo.length} new`);
  for (const fu of todo) {
    try {
      const f = await parseFight(fu);
      if (f && f.persons.length === 2 && f.fighters[0].head != null) {
        byUrl.set(fu, { event: ev.name, date, url: fu,
          a: { name: f.persons[0].name, win: /w/i.test(f.persons[0].outcome), ...f.fighters[0] },
          b: { name: f.persons[1].name, win: /w/i.test(f.persons[1].outcome), ...f.fighters[1] } });
        added++; sinceSave++;
      }
    } catch { /* skip fight */ }
    if (sinceSave >= 10) { save(); sinceSave = 0; }
  }
  save();
}
save();
await browser.close();
console.log(`\nDONE: scanned ${scanned} events, added ${added} new, total ${byUrl.size} fights → ${OUT}`);
