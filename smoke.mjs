import pw from "file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
const ROUTES=["/","/events","/events/ufc-fight-night-muhammad-vs-bonfim","/fighters","/fighters/alex-pereira","/simulator","/betting","/research","/pricing","/dashboard","/compare","/methodology","/login","/responsible-gambling","/legal/terms"];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1366,height:850} });
await ctx.addInitScript(()=>{ try{localStorage.setItem("fv-age-ok","1");}catch{} });
const p = await ctx.newPage();
let bad=0;
for (const r of ROUTES) {
  const errs=[]; const h=m=>{const t=m.text?m.text():String(m); if(/csp|content security|refused to|blocked|404|hydrat/i.test(t)) errs.push(t.slice(0,90));};
  p.on("console",m=>{if(m.type()==="error")h(m);}); p.on("pageerror",e=>errs.push("ERR "+String(e).slice(0,80)));
  const resp = await p.goto("https://www.fightvex.com"+r,{waitUntil:"networkidle",timeout:60000});
  await p.waitForTimeout(1500);
  p.removeAllListeners("console"); p.removeAllListeners("pageerror");
  const status=resp.status();
  if (status>=400 || errs.length){ bad++; console.log(`BAD ${r} status=${status} errs=${JSON.stringify(errs.slice(0,2))}`); }
}
console.log(bad===0 ? "ALL CLEAN ✓ ("+ROUTES.length+" routes, 0 errors, all 2xx)" : bad+" pages with issues");
await b.close();
