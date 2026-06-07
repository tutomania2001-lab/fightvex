# ============================================================
# FightVex — REAL fight-statistics aggregator (ESPN).
#
# ESPN exposes per-fight statistics (significant strikes, takedowns,
# knockdowns, submissions, control time) on each competitor. This
# script aggregates each fighter's recent fights — their own output
# AND what their opponents landed on them — into raw career totals,
# written to src/lib/data/stats.generated.ts. fighters.ts turns
# these REAL totals into the metrics the Vex AI model uses (so the
# model runs on real numbers, not flat estimates).
#
# Run:  python scripts/fetch_stats.py   (heavy: ~1-2 min)
# ============================================================
import os, re, json, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN  = os.path.join(ROOT, "src", "lib", "data", "espn.generated.ts")
OVERRIDE = os.path.join(ROOT, "src", "lib", "data", "rankings.override.ts")
OUT  = os.path.join(ROOT, "src", "lib", "data", "stats.generated.ts")
CORE = "https://sports.core.api.espn.com/v2/sports/mma"
UA = {"User-Agent": "FightVex/1.0"}
MAX_FIGHTS = 8   # recent fights per fighter

def ej(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

def num(stats, name):
    for s in stats:
        if s.get("name") == name:
            try: return float(s.get("value"))
            except (TypeError, ValueError): return 0.0
    return 0.0

def mmss(v):
    # "20:49" -> seconds
    try:
        if isinstance(v, str) and ":" in v:
            m, s = v.split(":"); return int(m) * 60 + int(s)
    except Exception: pass
    return 0.0

def fight_minutes(period, max_rounds):
    if not period: return max_rounds * 5 if max_rounds else 15
    if max_rounds and period >= max_rounds:
        return max_rounds * 5            # went the distance (or finished in last round)
    return (period - 1) * 5 + 2.5        # finished mid-fight (round midpoint estimate)

def cat_stats(statref):
    try:
        st = ej(statref)
        cats = st.get("splits", {}).get("categories", [])
        return cats[0].get("stats", []) if cats else []
    except Exception:
        return []

def agg_fighter(fid):
    try:
        log = ej(f"{CORE}/athletes/{fid}/eventlog")
    except Exception:
        return fid, None
    items = [it for it in (log.get("events", {}).get("items") or []) if it.get("played") and it.get("competition", {}).get("$ref")]
    items = items[:MAX_FIGHTS]
    A = dict(fights=0, minutes=0.0, sigL=0.0, sigA=0.0, oSigL=0.0, oSigA=0.0,
             tdL=0.0, tdA=0.0, oTdL=0.0, oTdA=0.0, kd=0.0, oKd=0.0, sub=0.0, ctrl=0.0)
    for it in items:
        try:
            comp = ej(it["competition"]["$ref"])
            comps = comp.get("competitors", [])
            me = next((c for c in comps if str(c.get("id")) == str(fid)), None)
            opp = next((c for c in comps if str(c.get("id")) != str(fid)), None)
            if not me: continue
            ms = cat_stats(me.get("statistics", {}).get("$ref", "")) if me.get("statistics") else []
            os_ = cat_stats(opp.get("statistics", {}).get("$ref", "")) if opp and opp.get("statistics") else []
            if not ms: continue
            period = None
            try:
                stt = ej(comp["status"]["$ref"]) if comp.get("status", {}).get("$ref") else comp.get("status")
                period = stt.get("period") if stt else None
            except Exception: period = None
            mins = fight_minutes(period, (comp.get("format", {}).get("regulation", {}) or {}).get("periods"))
            A["fights"] += 1
            A["minutes"] += mins
            A["sigL"] += num(ms, "sigStrikesLanded"); A["sigA"] += num(ms, "sigStrikesAttempted")
            A["tdL"] += num(ms, "takedownsLanded"); A["tdA"] += num(ms, "takedownsAttempted")
            A["kd"] += num(ms, "knockDowns"); A["sub"] += num(ms, "submissions")
            A["ctrl"] += mmss(next((s.get("displayValue") for s in ms if s.get("name") == "timeInControl"), "0")) / 60.0
            if os_:
                A["oSigL"] += num(os_, "sigStrikesLanded"); A["oSigA"] += num(os_, "sigStrikesAttempted")
                A["oTdL"] += num(os_, "takedownsLanded"); A["oTdA"] += num(os_, "takedownsAttempted")
                A["oKd"] += num(os_, "knockDowns")
        except Exception:
            continue
    if A["fights"] == 0:
        return fid, None
    return fid, {k: round(v, 2) for k, v in A.items()}

def main():
    text = open(GEN, encoding="utf-8").read()
    # Also include the ranked roster additions (real ESPN ids) so their profiles
    # get real per-fight stats too.
    try:
        text += "\n" + open(OVERRIDE, encoding="utf-8").read()
    except FileNotFoundError:
        pass
    pairs = re.findall(r'"id":\s*"(\d+)",\s*"slug":\s*"([^"]+)"', text)
    ids = sorted({fid for fid, slug in pairs if not slug.startswith("ufc-")})
    print(f"aggregating real stats for {len(ids)} fighters…")
    out = {}
    with ThreadPoolExecutor(max_workers=24) as ex:
        for fid, agg in ex.map(agg_fighter, ids):
            if agg: out[fid] = agg
    print(f"  got real stats for {len(out)}/{len(ids)} fighters")
    banner = (
        "// ============================================================\n"
        "// AUTO-GENERATED by scripts/fetch_stats.py — DO NOT EDIT.\n"
        "// REAL aggregated fight statistics from the ESPN public MMA API\n"
        "// (recent fights). Keyed by ESPN athlete id. fighters.ts turns\n"
        "// these into the model's per-fighter metrics. Regenerate with:\n"
        "//   python scripts/fetch_stats.py\n"
        "// ============================================================\n"
        "/* eslint-disable */\n\n"
        "export interface RealAgg {\n"
        "  fights: number; minutes: number;\n"
        "  sigL: number; sigA: number; oSigL: number; oSigA: number;\n"
        "  tdL: number; tdA: number; oTdL: number; oTdA: number;\n"
        "  kd: number; oKd: number; sub: number; ctrl: number;\n"
        "}\n\n"
        f"export const REAL_AGG: Record<string, RealAgg> = {json.dumps(out, indent=2)};\n"
    )
    open(OUT, "w", encoding="utf-8", newline="\n").write(banner)
    print(f"  wrote {OUT}")

if __name__ == "__main__":
    main()
