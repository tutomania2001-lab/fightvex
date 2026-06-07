import pw from "file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
const ROUTES = [
  ["/","home"],["/events","events"],["/events/ufc-fight-night-muhammad-vs-bonfim","event"],
  ["/fighters","roster"],["/fighters/alex-pereira","fighter"],["/simulator","sim"],
  ["/betting","betting"],["/research","research"],["/pricing","pricing"],["/dashboard","dashboard"],
  ["/compare","compare"],["/methodology","methodology"],["/login","login"],
  ["/responsible-gambling","rg"],["/legal/terms","legal"]
];
const b = await chromium.launch();
const errors = {};
for (const [vw,tag] of [[1366,"d"],[390,"m"]]) {
  const ctx = await b.newContext({ viewport:{width:vw,height:vw<500?844:900}, deviceScaleFactor:1, isMobile:vw<500, hasTouch:vw<500 });
  await ctx.addInitScript(()=>{ try{localStorage.setItem("fv-age-ok","1");}catch{} });
  const p = await ctx.newPage();
  const errs=[]; p.on("pageerror",e=>errs.push("PAGEERR "+String(e).slice(0,120)));
  p.on("console",m=>{ if(m.type()==="error") errs.push("CONSOLE "+m.text().slice(0,120)); });
  for (const [route,name] of ROUTES) {
    try {
      await p.goto("https://www.fightvex.com"+route,{waitUntil:"networkidle",timeout:60000});
      await p.waitForTimeout(vw<500?2500:2000);
      await p.screenshot({ path:`shots/audit/${name}-${tag}.png`, fullPage:true });
    } catch(e){ errs.push("NAVFAIL "+route+" "+String(e).slice(0,80)); }
  }
  errors[tag]=errs;
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(errors,null,1));
