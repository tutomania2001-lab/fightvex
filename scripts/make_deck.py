# FightVex pitch deck -> branded HTML -> Chrome headless prints to PDF.
# Identity: fight-poster / editorial. Recurring motif = the chrome X-arrow mark
# (public/ui/hero-x-logo.png). No site-UI cards, no glove. Run:
#   python scripts/make_deck.py
import base64, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def b64(p):
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode()

LOGO = b64(os.path.join(ROOT, "public", "logo.png"))
XMARK = b64(os.path.join(ROOT, "public", "ui", "hero-x-logo.png"))
OCTA = b64(os.path.join(ROOT, "public", "bg-octagon.jpg"))
BRUNSON = b64(os.path.join(ROOT, "src", "app", "fonts", "Brunson.ttf"))

def img(d, m="image/png"):
    return f"data:{m};base64,{d}"

STYLE = """
<style>
@font-face{font-family:'Brunson';src:url(__BRUNSON__) format('truetype');font-display:swap;}
@page{size:297mm 167mm;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
:root{--bg:#0a0b0d;--line:#23262d;--soft:#191c22;--blood:#e10600;--amber:#ffb000;
  --edge:#3fdd80;--blue:#2e90ff;--fg:#f5f6f8;--muted:#9296a0;--faint:#5b606a;--steel:#c4c8ce;}
body{background:var(--bg);color:var(--fg);font-family:'Segoe UI',-apple-system,Roboto,Helvetica,Arial,sans-serif;}
.disp{font-family:'Brunson','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.5px;line-height:1;}
.slide{position:relative;width:297mm;height:167mm;overflow:hidden;background:var(--bg);page-break-after:always;
  padding:15mm 18mm 14mm;display:flex;flex-direction:column;}
.slide:last-child{page-break-after:auto;}
.tex{position:absolute;inset:0;z-index:0;background-image:url(__OCTA__);background-size:cover;background-position:center;opacity:.05;}
.flare{position:absolute;inset:0;z-index:0;pointer-events:none;}
.xwm{position:absolute;z-index:0;pointer-events:none;opacity:.07;}
.content{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;min-height:0;}
.kicker{font-size:9.5pt;letter-spacing:4px;text-transform:uppercase;color:var(--steel);font-weight:600;}
.kicker::after{content:'';display:block;width:15mm;height:1.1mm;background:var(--blood);margin-top:3.5mm;}
.head{font-family:'Brunson',sans-serif;text-transform:uppercase;font-size:36pt;line-height:.98;margin:5.5mm 0 7mm;letter-spacing:.5px;}
.blood{color:var(--blood);}.blue{color:var(--blue);}.edge{color:var(--edge);}.amber{color:var(--amber);}
.lead{font-size:12.5pt;color:var(--steel);line-height:1.5;max-width:222mm;}
.lead b{color:var(--fg);}
.foot{position:absolute;left:18mm;right:18mm;bottom:8mm;z-index:3;display:flex;align-items:center;gap:7mm;
  border-top:1px solid var(--line);padding-top:3.5mm;font-size:8pt;color:var(--faint);letter-spacing:1.5px;text-transform:uppercase;}
.foot img{height:4.5mm;opacity:.85;}.foot .pg{margin-left:auto;font-family:'Brunson',sans-serif;letter-spacing:1px;color:var(--muted);}
.cols{display:flex;gap:9mm;}
.col{flex:1;}
.col .bar{height:3mm;width:16mm;border-radius:2mm;margin-bottom:5mm;}
.col h3{font-family:'Brunson',sans-serif;text-transform:uppercase;font-size:14.5pt;color:var(--fg);margin-bottom:2.5mm;letter-spacing:.5px;}
.col p{font-size:10pt;color:var(--muted);line-height:1.5;}
.elist{display:flex;flex-direction:column;}
.erow{display:grid;grid-template-columns:14mm 1fr;gap:5mm;padding:3.4mm 0;border-top:1px solid var(--soft);align-items:start;}
.erow:first-child{border-top:none;}
.erow .n{font-family:'Brunson',sans-serif;font-size:17pt;line-height:1;}
.erow .lab{font-family:'Brunson',sans-serif;text-transform:uppercase;font-size:12pt;color:var(--fg);letter-spacing:.5px;}
.erow .desc{font-size:9.5pt;color:var(--muted);line-height:1.4;margin-top:.8mm;}
.stats{display:flex;gap:9mm;margin-top:1mm;}
.stat{flex:1;border-left:1.2mm solid var(--line);padding-left:5mm;}
.stat .n{font-family:'Brunson',sans-serif;font-size:44pt;line-height:.85;}
.stat .l{margin-top:4mm;font-size:8.5pt;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}
.stat .s{margin-top:1.5mm;font-size:7.5pt;color:var(--faint);}
.bcols{display:flex;gap:12mm;}
.blist{flex:1;list-style:none;}
.blist li{font-size:10pt;color:var(--steel);line-height:1.4;padding:2.7mm 0 2.7mm 7mm;position:relative;border-top:1px solid var(--soft);}
.blist li:first-child{border-top:none;}
.blist li::before{content:'';position:absolute;left:0;top:3.8mm;width:2.8mm;height:2.8mm;transform:rotate(45deg);background:var(--blood);}
.blist li.b::before{background:var(--blue);}.blist li.e::before{background:var(--edge);}
.blist li b{color:var(--fg);}
.kline{margin-top:auto;font-size:11.5pt;color:var(--fg);font-family:'Brunson',sans-serif;text-transform:uppercase;letter-spacing:.5px;}
.tag{display:inline-block;font-family:'Brunson',sans-serif;letter-spacing:1px;text-transform:uppercase;font-size:8.5pt;
  color:var(--steel);border:1px solid var(--line);border-radius:30px;padding:1.6mm 4.5mm;margin:1mm 1.5mm 0 0;}
.tag.blue{color:#bcdcff;border-color:#244a72;}.tag.blood{color:#ffb3b1;border-color:#5e1716;}
.note{font-size:8pt;color:var(--faint);line-height:1.5;max-width:235mm;margin-top:auto;}
</style>
""".replace("__BRUNSON__", img(BRUNSON, "font/ttf")).replace("__OCTA__", img(OCTA, "image/jpeg"))

def motif(xpos="bottom:-32mm;right:-26mm;width:150mm;transform:rotate(-10deg);",
          flare="radial-gradient(48% 70% at 100% 4%,rgba(225,6,0,.12),transparent 60%)"):
    return (f'<div class="tex"></div><div class="flare" style="background:{flare};"></div>'
            f'<img class="xwm" style="{xpos}" src="{img(XMARK)}"/>')

def head(kicker, title, sub=""):
    s = f'<div class="lead" style="margin-bottom:9mm;">{sub}</div>' if sub else ""
    return f'<div class="content"><div class="kicker">{kicker}</div><div class="head">{title}</div>{s}'

def foot(n):
    return (f'<div class="foot"><img src="{img(LOGO)}"/><span>fightvex.com</span>'
            f'<span>UFC fight intelligence</span><span class="pg">{n:02d} / 14</span></div>')

def col(bar, h, p):
    return f'<div class="col"><div class="bar" style="background:{bar};"></div><h3>{h}</h3><p>{p}</p></div>'

def erow(n, c, lab, desc):
    return f'<div class="erow"><div class="n" style="color:{c};">{n}</div><div><div class="lab">{lab}</div><div class="desc">{desc}</div></div></div>'

def stat(n, c, l, s):
    return f'<div class="stat"><div class="n" style="color:{c};">{n}</div><div class="l">{l}</div><div class="s">{s}</div></div>'

S = []

# 1 COVER
S.append(f"""
<div class="tex" style="opacity:.17;"></div>
<div class="flare" style="background:radial-gradient(55% 85% at 6% 82%,rgba(225,6,0,.32),transparent 55%),radial-gradient(48% 70% at 96% 16%,rgba(46,144,255,.20),transparent 60%);"></div>
<img class="xwm" style="top:50%;right:-36mm;transform:translateY(-50%) rotate(-8deg);width:180mm;opacity:.14;" src="{img(XMARK)}"/>
<div class="content" style="justify-content:center;">
  <div class="kicker" style="color:var(--muted);">Pitch Deck &nbsp;&mdash;&nbsp; 2026</div>
  <img src="{img(LOGO)}" style="height:30mm;margin:11mm 0 9mm;align-self:flex-start;"/>
  <div class="disp" style="font-size:25pt;">AI fight intelligence for the <span class="blood">UFC</span></div>
  <div class="lead" style="margin-top:6mm;font-size:13.5pt;">Transparent predictions. Real odds. A track record you can actually verify.</div>
</div>{foot(1)}""")

# 2 WHAT IS IT
S.append(motif() + head("The one-liner", 'We simulate the fight <span class="blue">before</span> it happens.',
  'FightVex runs every UFC bout through an AI engine <b>50,000 times</b> &mdash; then hands fans and bettors the tools, and the proof, to use it. No black box, no hype.') + f"""
  <div class="cols">
    {col('var(--blue)','Predict','Win %, method and round for every fighter on every card.')}
    {col('var(--blood)','Analyse','Real stats, a transparent skill read, and a plain-English &ldquo;why&rdquo;.')}
    {col('var(--edge)','Bet smarter','Live odds, value signals and EV / CLV / bankroll math.')}
  </div>
</div>{foot(2)}""")

# 3 PROBLEM
S.append(motif() + head("Why it exists", 'Picking fights is <span class="blood">broken</span>.') + f"""
  <div class="elist">
    {erow('01','var(--blood)','Everyone&rsquo;s guessing','Gut feeling and highlight reels &mdash; no honest, data-driven read.')}
    {erow('02','var(--blood)','Tipsters dodge the score','Winners get posted, losers get deleted. No tamper-proof record.')}
    {erow('03','var(--blue)','The data is scattered','Striking, takedowns, layoffs, odds, weigh-ins &mdash; never in one place.')}
    {erow('04','var(--blue)','The house keeps the edge','Casual bettors pay the vig and can&rsquo;t see where the value is.')}
  </div>
  <div class="kline">FightVex &mdash; one transparent engine, real tools, a record you can check.</div>
</div>{foot(3)}""")

# 4 WHO FOR
S.append(motif() + head("Audience", 'Built for anyone with a <span class="blue">stake</span>.') + f"""
  <div class="cols" style="margin-top:3mm;">
    {col('var(--blue)','Fans','Smarter, data-backed reads on every card.')}
    {col('var(--blood)','Bettors','Find value vs the market and manage bankroll.')}
    {col('var(--edge)','Fantasy &amp; pick&rsquo;em','Beat friends and pools with sharper picks.')}
    {col('var(--amber)','Media &amp; analysts','Cite a transparent, sourced model.')}
  </div>
</div>{foot(4)}""")

# 5 TOOLS
S.append(motif("bottom:-34mm;right:-30mm;width:140mm;transform:rotate(-10deg);") + head("The product", 'Everything you can do.') + f"""
  <div class="cols" style="margin-bottom:6mm;">
    {col('var(--blue)','AI Simulator','Pick any two fighters; watch the engine run the fight.')}
    {col('var(--blue)','Predictions','The full read on every bout of every upcoming card.')}
    {col('var(--blue)','Free Pick of the Week','One complete prediction, free, no account needed.')}
  </div>
  <div class="cols" style="margin-bottom:6mm;">
    {col('var(--edge)','The Edge Desk','Live odds, value leans, EV / CLV / Kelly calculators.')}
    {col('var(--edge)','Bet Log','Track your bets and your real closing-line value.')}
    {col('var(--blood)','Accuracy Record','Public, pre-registered scoreboard of every pick.')}
  </div>
  <div class="cols">
    {col('var(--blood)','Fighter Profiles','Real per-fight stats and side-by-side compare.')}
    {col('var(--amber)','Watchlist Alerts','Get emailed when your fighter is booked or a line moves.')}
    {col('var(--amber)','Research Feed','Live UFC news from trusted outlets, in one place.')}
  </div>
</div>{foot(5)}""")

# 6 MODEL
S.append(motif() + head("Under the hood", 'How the Vex AI <span class="blue">thinks</span>.') + f"""
  <div class="elist">
    {erow('1','var(--blue)','Start with real data','Actual fight stats per fighter &mdash; strikes, takedowns, knockdowns, control, finishes.')}
    {erow('2','var(--blue)','Build a transparent rating','A skill profile across striking, wrestling, grappling, cardio, durability &mdash; adjusted for opposition.')}
    {erow('3','var(--blood)','Simulate 50,000 times','A round-by-round engine plays the fight out: where it&rsquo;s fought, fatigue, damage, finish paths.')}
    {erow('4','var(--blood)','Calibrate the odds','Tuned on thousands of results so &ldquo;65%&rdquo; really happens about 65% of the time.')}
    {erow('5','var(--edge)','Add fight-week signals','Short notice, missed weight and injuries &mdash; what the market is slow to price.')}
  </div>
</div>{foot(6)}""")

# 7 TRUST
S.append(motif() + head("Why trust it", 'Proof, not <span class="blood">promises</span>.') + f"""
  <div class="cols" style="margin-bottom:7mm;">
    {col('var(--edge)','Leakage-free backtest','The live engine re-graded on 10,206 real bouts &mdash; rebuilt from prior fights only, no hindsight.')}
    {col('var(--edge)','Pre-registered record','Every pick logged before the fight. Wins and losses both stay public.')}
  </div>
  <div class="cols">
    {col('var(--blue)','Bitcoin-anchored picks','Each card&rsquo;s picks are hashed onto the blockchain &mdash; proof they weren&rsquo;t back-dated.')}
    {col('var(--blue)','Beats the closing line','We track the model vs where the market closes &mdash; the sharpest test of edge.')}
  </div>
  <div class="kline" style="font-size:10.5pt;color:var(--muted);">Real data only &mdash; nothing fabricated, estimates labelled.</div>
</div>{foot(7)}""")

# 8 NUMBERS
S.append(motif("bottom:-30mm;right:-24mm;width:150mm;transform:rotate(-10deg);",
  "radial-gradient(50% 70% at 100% 4%,rgba(63,221,128,.10),transparent 60%)") + head("The record", 'How good is it?') + f"""
  <div class="stats">
    {stat('64.6%','var(--edge)','Backtest accuracy','winner picks, 10,206 bouts')}
    {stat('63.5%','var(--edge)','Held-out recent','never tuned on')}
    {stat('10,206','var(--blue)','Real bouts tested','leakage-free')}
    {stat('50k','var(--blue)','Sims per fight','Monte-Carlo depth')}
  </div>
  <div class="note">Figures from the model&rsquo;s own validated backtest and live record. Predictions are probabilistic estimates, not guarantees &mdash; well-calibrated, but fights are uncertain by nature. 21+. Informational only, not betting advice.</div>
</div>{foot(8)}""")

# 9 SECURITY
S.append(motif() + head("Security &amp; privacy", 'Your account, <span class="blue">protected</span>.') + f"""
  <div class="bcols">
    <ul class="blist">
      <li class="b"><b>Hashed passwords</b> &mdash; scrypt, never plain text.</li>
      <li class="b"><b>Opaque sessions</b> with instant revocation.</li>
      <li class="b"><b>Rate-limiting &amp; lockout</b> &mdash; stops brute force.</li>
      <li class="b"><b>CSRF protection &amp; strict CSP</b>.</li>
    </ul>
    <ul class="blist">
      <li class="e"><b>Encrypted secrets</b> &mdash; in a vault, never in code.</li>
      <li class="e"><b>Signed background jobs</b> &mdash; verified, not open.</li>
      <li class="e"><b>You own your data</b> &mdash; cancel or delete anytime.</li>
      <li class="e"><b>A public security page</b> &mdash; documented openly.</li>
    </ul>
  </div>
  <div class="kline" style="font-size:10.5pt;color:var(--muted);">No system is ever &ldquo;100% safe&rdquo; &mdash; so we practise defense-in-depth and keep hardening.</div>
</div>{foot(9)}""")

# 10 TECH
S.append(motif() + head("How it&rsquo;s built", 'Modern, lean, <span class="edge">automated</span>.',
  'Serverless infrastructure that&rsquo;s fast worldwide, cheap to run and scales itself &mdash; so almost every pound of revenue is margin.') + f"""
  <div class="cols" style="margin-bottom:6mm;">
    {col('var(--blue)','Next.js + Vercel','The fast, globally-served app.')}
    {col('var(--blue)','Supabase','Accounts &amp; data, strict access.')}
    {col('var(--blue)','Upstash Redis','Sessions, limits, odds history.')}
    {col('var(--edge)','Stripe','Subscriptions &amp; billing.')}
  </div>
  <div class="cols">
    {col('var(--edge)','Resend','Transactional email &amp; alerts.')}
    {col('var(--edge)','PostHog','Privacy-aware analytics.')}
    {col('var(--blood)','Sentry','Real-time error monitoring.')}
    {col('var(--blood)','Auto-refresh CI','Pulls real data daily &amp; deploys.')}
  </div>
</div>{foot(10)}""")

# 11 BUSINESS
S.append(motif() + head("Business model", 'Simple, fair <span class="blue">pricing</span>.') + f"""
  <div class="cols" style="margin-bottom:8mm;">
    <div class="col"><div class="bar" style="background:var(--faint);"></div><h3>Free</h3>
      <p>Browse fighters, cards and real odds, read the Free Pick, and run <b style="color:#f5f6f8">one</b> real simulation.</p>
      <div style="margin-top:4mm;"><span class="tag">&pound;0 forever</span></div></div>
    <div class="col"><div class="bar" style="background:var(--blue);"></div><h3 class="blue">Pro</h3>
      <p>Everything unlocked &mdash; unlimited sims, every full read, all betting tools, the bet log and alerts.</p>
      <div style="margin-top:4mm;"><span class="tag blue">&pound;10 / month</span><span class="tag blue">&pound;70 / year</span><span class="tag">7-day trial</span></div></div>
  </div>
  <div class="stats">
    {stat('7-day','var(--blue)','Free trial','cancel anytime')}
    {stat('Lean','var(--edge)','Cost to serve','serverless &amp; automated')}
    {stat('B2B','var(--blood)','Next revenue','data &amp; embeds for media')}
  </div>
</div>{foot(11)}""")

# 12 ROADMAP
S.append(motif() + head("What&rsquo;s next", 'Where we&rsquo;re <span class="blood">going</span>.') + f"""
  <div class="bcols">
    <ul class="blist">
      <li><b>Shareable pick &amp; result cards</b> &mdash; viral, free growth.</li>
      <li class="b"><b>Pick&rsquo;em vs the AI</b> &mdash; compete on a leaderboard.</li>
      <li class="e"><b>Growing live CLV record</b> &mdash; proof it beats the close.</li>
    </ul>
    <ul class="blist">
      <li class="e"><b>Deeper fight-week intel</b> &mdash; injuries, news, matchups.</li>
      <li><b>Affiliate &amp; card passes</b> &mdash; revenue without a price rise.</li>
      <li class="b"><b>Beyond the UFC, later</b> &mdash; the same engine extends.</li>
    </ul>
  </div>
</div>{foot(12)}""")

# 13 PRINCIPLES
S.append(motif() + head("Responsible &amp; honest", 'How we <span class="blue">operate</span>.') + f"""
  <div class="elist">
    {erow('01','var(--blood)','21+ and informational only','Analytics, not advice. We never accept wagers.')}
    {erow('02','var(--blue)','Transparency over hype','Open methodology, explainable picks, losses left visible.')}
    {erow('03','var(--edge)','Real data, no fabrication','We never invent stats or accuracy; estimates are labelled.')}
    {erow('04','var(--amber)','Responsible gambling first','Clear disclaimers and links to help; bet within your means.')}
  </div>
</div>{foot(13)}""")

# 14 CLOSE
S.append(f"""
<div class="tex" style="opacity:.16;"></div>
<div class="flare" style="background:radial-gradient(55% 85% at 92% 80%,rgba(225,6,0,.30),transparent 55%),radial-gradient(48% 70% at 8% 16%,rgba(46,144,255,.18),transparent 60%);"></div>
<img class="xwm" style="top:50%;left:-40mm;transform:translateY(-50%) rotate(8deg);width:175mm;opacity:.13;" src="{img(XMARK)}"/>
<div class="content" style="justify-content:center;align-items:flex-end;text-align:right;">
  <img src="{img(LOGO)}" style="height:26mm;margin-bottom:8mm;"/>
  <div class="disp" style="font-size:30pt;">Predict <span class="blood">smarter</span>.</div>
  <div class="lead" style="margin-top:6mm;text-align:right;">Transparent AI fight intelligence &mdash; with a record you can check.</div>
  <div class="disp" style="margin-top:12mm;font-size:15pt;color:var(--blue);letter-spacing:2px;">fightvex.com</div>
</div>{foot(14)}""")

html = "<!doctype html><html lang='en'><head><meta charset='utf-8'>" + STYLE + "</head><body>"
for inner in S:
    html += f'<section class="slide">{inner}</section>'
html += "</body></html>"

open(os.path.join(ROOT, "deck.html"), "w", encoding="utf-8").write(html)
print("wrote deck.html with", len(S), "slides")
