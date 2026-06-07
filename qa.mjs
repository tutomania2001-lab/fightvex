import pw from "file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
const PAGES=[["/compare","compare"],["/methodology","methodology"],["/dashboard","dashboard"],["/responsible-gambling","rg"],["/legal/privacy","legal"],["/login","login"]];
const b = await chromium.launch();
for (const [vw,tag] of [[1366,"d"],[390,"m"]]) {
  const ctx = await b.newContext({ viewport:{width:vw,height:vw<500?844:900}, deviceScaleFactor:1, isMobile:vw<500, hasTouch:vw<500 });
  await ctx.addInitScript(()=>{ try{localStorage.setItem("fv-age-ok","1");}catch{} });
  const p = await ctx.newPage();
  for (const [route,name] of PAGES) {
    await p.goto("https://www.fightvex.com"+route,{waitUntil:"networkidle",timeout:60000});
    await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y); await new Promise(r=>setTimeout(r,80));} window.scrollTo(0,0); });
    await p.waitForTimeout(700);
    // check for horizontal overflow (a common mobile bug)
    const ov = await p.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await p.screenshot({ path:`shots/audit/${name}-${tag}2.png`, fullPage:true });
    if (ov>2) console.log(`OVERFLOW ${name}-${tag}: ${ov}px`);
  }
  await ctx.close();
}
await b.close(); console.log("done");
