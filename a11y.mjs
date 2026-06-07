import pw from "file:///C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1366,height:850} });
await ctx.addInitScript(()=>{ try{localStorage.setItem("fv-age-ok","1");}catch{} });
const p = await ctx.newPage();
for (const r of ["/","/simulator","/betting","/fighters","/events","/compare","/pricing"]) {
  await p.goto("https://www.fightvex.com"+r,{waitUntil:"networkidle",timeout:60000});
  await p.waitForTimeout(1500);
  const a = await p.evaluate(()=>{
    const noAlt=[...document.querySelectorAll('img')].filter(i=>i.getAttribute('alt')===null).length;
    const btnNoName=[...document.querySelectorAll('button,a')].filter(el=>{
      const t=(el.innerText||'').trim(); const al=el.getAttribute('aria-label')||el.getAttribute('title');
      const hasImg=el.querySelector('img,svg'); return !t && !al && !el.children.length===false && hasImg;
    }).map(el=>el.tagName+'.'+(el.className||'').toString().split(' ')[0]).slice(0,5);
    const h1=document.querySelectorAll('h1').length;
    return { noAlt, btnNoName, h1 };
  });
  console.log(r, JSON.stringify(a));
}
await b.close();
