# ============================================================
# FightVex — fetch + crop ESPN headshots for the ranked fighters
# added in rankings.override.ts (the real contenders ESPN's stale
# snapshot was missing). Looks up each fighter's ESPN MMA athlete
# id via the public search API, downloads the bust, alpha-crops it,
# saves public/fighters/<slug>-head.png, then MERGES the results
# into src/lib/data/portraits.ts (existing entries preserved).
#
# Run:  python scripts/fetch_additions_headshots.py
# Requires: Pillow
# ============================================================
import os, re, io, json, time, unicodedata, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OVERRIDE = os.path.join(ROOT, "src", "lib", "data", "rankings.override.ts")
PORTRAITS_TS = os.path.join(ROOT, "src", "lib", "data", "portraits.ts")
OUT = os.path.join(ROOT, "public", "fighters")
UA = "Mozilla/5.0 FightVexAssetFetcher/1.0"
KINDS = ["full", "stance/right", "stance/left"]

from PIL import Image


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def http(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def espn_mma_id(name):
    """Return the ESPN MMA athlete id for a fighter name, or None."""
    q = urllib.parse.quote(name)
    url = f"https://site.web.api.espn.com/apis/search/v2?region=us&lang=en&query={q}&limit=12"
    try:
        data = json.loads(http(url))
    except Exception:
        return None
    players = []
    for grp in data.get("results", []):
        for c in grp.get("contents", []):
            if c.get("type") != "player":
                continue
            uid = c.get("uid", "") or ""
            link = ((c.get("link") or {}).get("web")) or ""
            if "s:3301" not in uid and "/mma/" not in link:
                continue  # not an MMA fighter
            m = re.search(r"a:(\d+)", uid) or re.search(r"/id/(\d+)", link)
            if not m:
                continue
            players.append((c.get("displayName", ""), m.group(1)))
    if not players:
        return None
    # Prefer an exact normalized-name match, else the first MMA result.
    for disp, fid in players:
        if norm(disp) == norm(name):
            return fid
    return players[0][1]


def fetch_headshot(fid):
    for kind in KINDS:
        url = f"https://a.espncdn.com/i/headshots/mma/players/{kind}/{fid}.png"
        try:
            data = http(url)
        except Exception:
            continue
        if len(data) < 12000:        # tiny = placeholder / missing
            continue
        im = Image.open(io.BytesIO(data)).convert("RGBA")
        bb = im.split()[3].getbbox()
        if bb:
            im = im.crop(bb)
        return im
    return None


def parse_additions():
    text = open(OVERRIDE, encoding="utf-8").read()
    m = text.index("ROSTER_ADDITIONS")
    arr = text[text.index("[", m):]
    # crude but safe: pull "slug": "x", "name": "y" pairs in order
    return re.findall(r'"slug":\s*"([^"]+)",\s*"name":\s*"([^"]+)"', arr)


def existing_portraits():
    text = open(PORTRAITS_TS, encoding="utf-8").read()
    return dict(re.findall(r'"([^"]+)":\s*"(/fighters/[^"]+)"', text))


def write_portraits(mapping):
    items = sorted(mapping.items())
    lines = "\n".join(f'  "{s}": "{p}",' for s, p in items)
    ts = (
        "// ============================================================\n"
        "// FightVex — curated fighter portraits (AUTO-GENERATED).\n"
        "//\n"
        "// Maps a fighter slug -> an ESPN headshot in /public/fighters,\n"
        "// fetched + cropped by scripts/fetch_headshots.py and\n"
        "// scripts/fetch_additions_headshots.py. Fighters without an\n"
        "// entry fall back to the silhouette.\n"
        "// ============================================================\n"
        "export const PORTRAITS: Record<string, string> = {\n"
        f"{lines}\n"
        "};\n\n"
        "export function portraitFor(slug: string): string | undefined {\n"
        "  return PORTRAITS[slug];\n"
        "}\n"
    )
    open(PORTRAITS_TS, "w", encoding="utf-8").write(ts)


def main():
    os.makedirs(OUT, exist_ok=True)
    additions = parse_additions()
    portraits = existing_portraits()
    print(f"{len(additions)} additions; {len(portraits)} existing portraits")
    ok = miss = 0
    for slug, name in additions:
        if slug in portraits and os.path.exists(os.path.join(OUT, f"{slug}-head.png")):
            ok += 1
            continue
        fid = espn_mma_id(name)
        im = fetch_headshot(fid) if fid else None
        if im is None:
            print(f"MISS {slug:26s} (name={name}, id={fid})")
            miss += 1
            continue
        im.save(os.path.join(OUT, f"{slug}-head.png"))
        portraits[slug] = f"/fighters/{slug}-head.png"
        print(f"OK   {slug:26s} <- ESPN {fid}")
        ok += 1
        time.sleep(0.15)
    write_portraits(portraits)
    print(f"\nDone. {ok} resolved, {miss} missing. portraits.ts now has {len(portraits)} entries.")


if __name__ == "__main__":
    main()
