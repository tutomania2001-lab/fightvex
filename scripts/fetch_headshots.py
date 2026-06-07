# ============================================================
# FightVex — fetch + crop ESPN headshots for every fighter in
# espn.generated.ts, then (re)write src/lib/data/portraits.ts.
#
# ESPN is the primary source. For each fighter id we try the
# full bust, then the stance cutouts. Images are alpha-cropped to
# the subject and saved to public/fighters/<slug>-head.png.
#
# Run:  python scripts/fetch_headshots.py
# Requires: Pillow  (pip install pillow)
# ============================================================
import os, re, io, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN  = os.path.join(ROOT, "src", "lib", "data", "espn.generated.ts")
OUT  = os.path.join(ROOT, "public", "fighters")
PORTRAITS_TS = os.path.join(ROOT, "src", "lib", "data", "portraits.ts")
UA = "FightVexAssetFetcher/1.0 (contact: tutomania2001@gmail.com)"
KINDS = ["full", "stance/right", "stance/left"]

from PIL import Image

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()

def load_existing():
    # Keep prior mappings so a transient network miss never removes a fighter
    # that already has a headshot on disk (this script ADDS new card fighters,
    # it must never regress the database).
    try:
        txt = open(PORTRAITS_TS, encoding="utf-8").read()
    except OSError:
        return {}
    out = {}
    for s, p in re.findall(r'"([^"]+)":\s*"(/fighters/[^"]+-head\.png)"', txt):
        if os.path.exists(os.path.join(ROOT, "public", p.lstrip("/"))):
            out[s] = p
    return out


def main():
    text = open(GEN, encoding="utf-8").read()
    # fighter blocks: "id": "<digits>", ... "slug": "<slug>"
    pairs = re.findall(r'"id":\s*"(\d+)",\s*"slug":\s*"([^"]+)"', text)
    os.makedirs(OUT, exist_ok=True)
    found = load_existing()
    print(f"{len(found)} existing portraits kept (refreshed on success)")
    for fid, slug in pairs:
        if slug.startswith("ufc-"):           # skip the event object
            continue
        if slug in found:                      # already have it — keep, don't refetch
            continue
        ok = False
        for kind in KINDS:
            url = f"https://a.espncdn.com/i/headshots/mma/players/{kind}/{fid}.png"
            try:
                data = fetch(url)
                if len(data) < 12000:          # tiny = placeholder / missing
                    continue
                im = Image.open(io.BytesIO(data)).convert("RGBA")
                bb = im.split()[3].getbbox()
                if bb:
                    im = im.crop(bb)
                im.save(os.path.join(OUT, f"{slug}-head.png"))
                found[slug] = f"/fighters/{slug}-head.png"
                print(f"OK   {slug:22s} <- {kind}")
                ok = True
                break
            except Exception:
                continue
        if not ok:
            print(f"MISS {slug}")
    # rewrite portraits.ts (sorted for a stable, clean diff)
    lines = "\n".join(f'  "{s}": "{found[s]}",' for s in sorted(found))
    ts = (
        "// ============================================================\n"
        "// FightVex — curated fighter portraits (AUTO-GENERATED).\n"
        "//\n"
        "// Maps a fighter slug -> an ESPN headshot in /public/fighters,\n"
        "// fetched + cropped by scripts/fetch_headshots.py. Fighters\n"
        "// without an entry fall back to the silhouette. Regenerate after\n"
        "// the event/card changes:  python scripts/fetch_headshots.py\n"
        "// ============================================================\n"
        "export const PORTRAITS: Record<string, string> = {\n"
        f"{lines}\n"
        "};\n\n"
        "export function portraitFor(slug: string): string | undefined {\n"
        "  return PORTRAITS[slug];\n"
        "}\n"
    )
    open(PORTRAITS_TS, "w", encoding="utf-8", newline="\n").write(ts)
    print(f"\nWrote {len(found)} portraits -> {PORTRAITS_TS}")

if __name__ == "__main__":
    main()
