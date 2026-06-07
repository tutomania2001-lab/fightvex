import pw from "file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1280,height:850}, deviceScaleFactor:1 });
await ctx.addInitScript(()=>{ try{localStorage.setItem("fv-age-ok","1");}catch{} });
const p = await ctx.newPage();
const viol=[];
p.on("console",m=>{ const t=m.text(); if(/content security policy|csp|refused to|blocked/i.test(t)) viol.push(t.slice(0,160)); });
p.on("pageerror",e=>viol.push("ERR "+String(e).slice(0,120)));
for (const r of ["/","/simulator","/betting","/fighters","/research","/events"]) {
  await p.goto("https://www.fightvex.com"+r,{waitUntil:"networkidle",timeout:60000});
  await p.waitForTimeout(2500);
}
// also check meta + jsonld on home
await p.goto("https://www.fightvex.com/",{waitUntil:"networkidle"});
const meta = await p.evaluate(()=>({
  title: document.title,
  desc: document.querySelector('meta[name=description]')?.content?.slice(0,60),
  og: document.querySelector('meta[property="og:image"]')?.content,
  ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>{try{return JSON.parse(s.textContent)['@graph']?.map(x=>x['@type'])}catch{return 'parse-fail'}}),
}));
console.log("CSP/violations:", JSON.stringify(viol.slice(0,8)));
console.log("META:", JSON.stringify(meta));
await b.close();
