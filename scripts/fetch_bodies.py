# ============================================================
# FightVex — fetch transparent FULL-BODY fighter images from each
# fighter's ufc.com athlete page (the athlete_bio_full_body style,
# current 2026 imagery). Alpha-crops + downscales each, saves to
# public/fighters/<slug>-body.png, and writes
# src/lib/data/bodies.generated.ts.
#
# Full-body shots are shown only inside an OPEN fight card; the
# headshot is used everywhere else and as the fallback when ufc.com
# has no page/image for a fighter (e.g. retired fighters).
#
# Run:  python scripts/fetch_bodies.py
# Requires: Pillow
# ============================================================
import os, re, io, json, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESPN = os.path.join(ROOT, "src", "lib", "data", "espn.generated.ts")
OVERRIDE = os.path.join(ROOT, "src", "lib", "data", "rankings.override.ts")
OUT = os.path.join(ROOT, "public", "fighters")
GEN = os.path.join(ROOT, "src", "lib", "data", "bodies.generated.ts")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
# ufc.com image style that returns the FULL standing (head-to-feet) stance shot,
# transparent PNG. The page's `athlete_bio_full_body` style is only a torso crop,
# so we extract the source filename and request this style instead.
FULL_BODY_STYLE = "event_fight_card_upper_body_of_standing_athlete"
# Every fighter is normalized onto an identical canvas (fighter scaled to a
# consistent height, centered, feet bottom-aligned) so they all render the SAME
# size. Images that crop in shorter than MIN_RATIO are torsos, not full bodies,
# and are rejected (the fighter falls back to the headshot).
# Every fighter is normalized to the same HEIGHT (tight horizontal crop, no side
# padding) so they all render the same size AND fill their box top-to-bottom.
CANVAS_H = 600
MIN_RATIO = 2.2
# Fraction of the full body kept for the waist-length "torso" crop (head -> shorts),
# used for the 2 fighters in the simulator hero / open fight cards.
WAIST_FRAC = 0.55

from PIL import Image

# UFC athlete slugs that differ from our ESPN-derived slug.
ALIASES = {
    "michael-venom-page": "michael-page",
}


def http(url, timeout=25, retries=2):
    last = None
    for _ in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
    raise last


def collect_fighters():
    pairs = {}
    espn = open(ESPN, encoding="utf-8").read()
    for fid, slug in re.findall(r'"id":\s*"(\d+)",\s*"slug":\s*"([^"]+)"', espn):
        if not slug.startswith("ufc-"):
            pairs[slug] = slug
    ov = open(OVERRIDE, encoding="utf-8").read()
    m = ov.find("ROSTER_ADDITIONS")
    for slug in re.findall(r'"slug":\s*"([^"]+)"', ov[m:]):
        pairs[slug] = slug
    return sorted(pairs)


def body_url_for(slug):
    ufc_slug = ALIASES.get(slug, slug)
    try:
        html = http(f"https://www.ufc.com/athlete/{ufc_slug}").decode("utf-8", "ignore")
    except Exception:
        return None
    # Any athlete image style on the page reveals the source filename (e.g.
    # "2025-03/PEREIRA_ALEX_L.png"); request it under the full-body style.
    m = re.search(r'/images/styles/[a-z0-9_]+/s3/([^"\'?]+\.png)', html)
    if not m:
        return None
    return f"https://www.ufc.com/images/styles/{FULL_BODY_STYLE}/s3/{m.group(1)}"


def normalize(im):
    """Tight alpha-crop, then scale the fighter to a consistent HEIGHT (no side
    padding) so every fighter is the same size and fills its box. None for torsos."""
    bb = im.split()[3].getbbox()
    if bb:
        im = im.crop(bb)
    w, h = im.size
    if h / w < MIN_RATIO:
        return None
    return im.resize((round(w * CANVAS_H / h), CANVAS_H), Image.LANCZOS)


def process(slug):
    url = body_url_for(slug)
    if not url:
        return (slug, None, "no-page-or-image")
    try:
        im = Image.open(io.BytesIO(http(url))).convert("RGBA")
    except Exception as e:
        return (slug, None, f"img-fail:{e}")
    norm = normalize(im)
    if norm is None:
        return (slug, None, "torso-only")
    norm.save(os.path.join(OUT, f"{slug}-body.png"), optimize=True)
    # waist-length crop (head -> shorts), alpha-trimmed
    tor = norm.crop((0, 0, norm.width, round(CANVAS_H * WAIST_FRAC)))
    bb = tor.split()[3].getbbox()
    if bb:
        tor = tor.crop(bb)
    tor.save(os.path.join(OUT, f"{slug}-torso.png"), optimize=True)
    return (slug, f"/fighters/{slug}-body.png", "ok")


def load_existing():
    # Keep prior mappings so a transient network miss never removes a fighter
    # that already has an image on disk.
    try:
        txt = open(GEN, encoding="utf-8").read()
    except OSError:
        return {}
    out = {}
    for s, p in re.findall(r'"([^"]+)":\s*"(/fighters/[^"]+-body\.png)"', txt):
        if os.path.exists(os.path.join(ROOT, "public", p.lstrip("/"))):
            out[s] = p
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    slugs = collect_fighters()
    print(f"{len(slugs)} fighters to try")
    bodies = load_existing()
    print(f"{len(bodies)} kept from previous run (refreshed on success)")
    ok = miss = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        for slug, path, status in ex.map(process, slugs):
            if path:
                bodies[slug] = path
                ok += 1
                print(f"OK   {slug}")
            else:
                miss += 1
                print(f"MISS {slug:28s} {status}")
    keys = sorted(bodies)
    bodies_ts = "\n".join(f'  "{s}": "/fighters/{s}-body.png",' for s in keys)
    torsos_ts = "\n".join(f'  "{s}": "/fighters/{s}-torso.png",' for s in keys)
    ts = (
        "// ============================================================\n"
        "// FightVex — fighter images (AUTO-GENERATED by scripts/fetch_bodies.py).\n"
        "//\n"
        "// BODIES = full head-to-feet standing stance shot (used INSIDE the\n"
        "// fighter-selection picker). TORSOS = the same image cropped to\n"
        "// waist length (used for the 2 fighters in the simulator hero and\n"
        "// open fight cards). Both normalized to a uniform width so every\n"
        "// fighter renders the same size. Source: ufc.com\n"
        "// (event_fight_card_upper_body_of_standing_athlete style).\n"
        "// ============================================================\n"
        "export const BODIES: Record<string, string> = {\n"
        f"{bodies_ts}\n"
        "};\n\n"
        "export const TORSOS: Record<string, string> = {\n"
        f"{torsos_ts}\n"
        "};\n\n"
        "export function bodyFor(slug: string): string | undefined {\n"
        "  return BODIES[slug];\n"
        "}\n\n"
        "export function torsoFor(slug: string): string | undefined {\n"
        "  return TORSOS[slug];\n"
        "}\n"
    )
    open(GEN, "w", encoding="utf-8").write(ts)
    print(f"\nDone. {ok} bodies, {miss} missing. Wrote bodies.generated.ts ({ok} entries).")


if __name__ == "__main__":
    main()
