# ============================================================
# FightVex — plan glove icons: thicken the thin line-art so it's
# legible at nav size, and add a subtle accent SHINE (top-lit
# gradient on the stroke + a soft glow). Pro = blue, Elite = red.
#
#   python scripts/glove_icons.py
# ============================================================
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = r"D:\UserData\Admin\Desktop\FightVex\Assets"
JOBS = {
    "pro":   {"src": os.path.join(ASSETS, "pro icon.png"),  "out": "plan-pro.png",
              "color": (46, 144, 255)},   # brand blue — Pro
    "elite": {"src": os.path.join(ASSETS, "Elite icon.png"), "out": "plan-elite.png",
              "color": (225, 6, 0)},      # brand blood red — Elite
}
THICK = 22     # grow the OUTLINE stroke (true dilation) so it stays legible but
               # stays an outline — no fill — when downscaled to ~34px nav size
GLOW = 16      # outer glow blur radius
GLOW_ALPHA = 42  # subtle — just enough to read on dark, not a bright halo


def dilate(alpha, r):
    """Grow the opaque region by ~r px via true morphological dilation (iterated
    MaxFilter). Unlike blur+threshold, this keeps THIN lines fully opaque as they
    thicken, so a heavy outline survives downscaling to nav size."""
    out = alpha.point(lambda p: 255 if p > 55 else 0)
    rem = int(round(r))
    while rem > 0:
        k = min(4, rem)
        out = out.filter(ImageFilter.MaxFilter(2 * k + 1))
        rem -= k
    return out


for k, j in JOBS.items():
    im = Image.open(j["src"]).convert("RGBA")
    size = im.size
    a = im.split()[3]
    color = j["color"]

    # Thick OUTLINE stroke (no fill) in a FLAT plan colour — no gradient.
    stroke_a = dilate(a, THICK).filter(ImageFilter.GaussianBlur(1.0))
    stroke = Image.composite(
        Image.new("RGBA", size, color + (255,)),
        Image.new("RGBA", size, (0, 0, 0, 0)),
        stroke_a,
    )

    # Faint outer glow in the same colour so the outline reads on dark.
    galpha = dilate(a, THICK).filter(ImageFilter.GaussianBlur(GLOW))
    glow = Image.composite(
        Image.new("RGBA", size, color + (GLOW_ALPHA,)),
        Image.new("RGBA", size, color + (0,)),
        galpha,
    )

    out = Image.alpha_composite(glow, stroke)
    out.save(os.path.join(ROOT, "public", j["out"]))
    print(f"wrote public/{j['out']}")
