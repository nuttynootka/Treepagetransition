"""Draws the 8-point star tabs in 14K unplated palladium white gold with a glass-bead
blasted (satin) finish.

Shape: the north star from the Noble Star Forest sign (tall top point, longer bottom
point), with side and diagonal points lengthened so they show around the word.
Each point is bevelled into four long faces meeting at a ridge, so one side catches
the light and the other is in soft shadow. The bead-blasted surface is matte with a
fine grain; the highlights are broad and soft rather than mirror-sharp.

Palladium white gold (unplated) is a soft, slightly warm grey-white, a little darker
and warmer than rhodium-plated white gold.

Run:  python3 scripts/make-gold-stars.py
Writes public/stars/white-gold-star-1.webp ... -3.webp (440 x 440, transparent).
Keep ARMS and CENTRE_Y in step with STAR_ARMS in components/garland-header/geometry.ts.
"""

import os
import numpy as np
from PIL import Image

OUT = 440
SS = 4
S = OUT * SS
CENTRE_Y = 0.40

ARMS = [
    (-135, 0.31, 0.1), (-45, 0.31, 0.1), (45, 0.29, 0.1), (135, 0.29, 0.1),
    (180, 0.36, 0.115), (0, 0.36, 0.115),
    (-90, 0.39, 0.125), (90, 0.58, 0.125),
]

VARIANTS = [
    {"light": (-0.45, -0.65, 0.62), "seed": 3},
    {"light": (0.5, -0.55, 0.67), "seed": 7},
    {"light": (-0.2, -0.8, 0.56), "seed": 11},
]

# Palladium white gold, from shadow to highlight (sRGB).
PALETTE = np.array([
    (0.00, (58, 56, 53)),
    (0.35, (128, 125, 119)),
    (0.65, (188, 184, 176)),
    (0.88, (226, 222, 214)),
    (1.00, (246, 243, 236)),
], dtype=object)


def norm(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def colourise(t):
    stops = [p[0] for p in PALETTE]
    cols = np.array([p[1] for p in PALETTE], float)
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(t, stops, cols[:, c])
    return out


def render(light, seed):
    rng = np.random.default_rng(seed)
    L = norm(light)
    V = np.array([0, 0, 1.0])
    H = norm(L + V)
    tone = np.zeros((S, S), float)
    alpha = np.zeros((S, S), float)
    seam = np.zeros((S, S), float)
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    cx, cy = S * 0.5, S * CENTRE_Y

    def shade(N):
        diff = max(0.0, N @ L)
        sheen = max(0.0, N @ H) ** 7  # broad, soft satin highlight
        return 0.12 + 0.62 * diff + 0.38 * sheen

    for deg, length, half in ARMS:
        a = np.radians(deg)
        u = np.array([np.cos(a), np.sin(a)])
        n = np.array([-np.sin(a), np.cos(a)])
        tip = np.array([cx, cy]) + u * length * S
        w = half * S
        root = np.array([cx, cy]) - u * w * 0.4
        offs = [-1.0, -0.45, 0.0, 0.45, 1.0]
        tilts = [-0.95, -0.42, 0.42, 0.95]
        for k in range(4):
            p0 = root + n * w * offs[k]
            p1 = root + n * w * offs[k + 1]
            x0, y0 = p0; x1, y1 = p1; x2, y2 = tip
            det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            l0 = ((y1 - y2) * (xx - x2) + (x2 - x1) * (yy - y2)) / det
            l1 = ((y2 - y0) * (xx - x2) + (x0 - x2) * (yy - y2)) / det
            l2 = 1 - l0 - l1
            m = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
            if not m.any():
                continue
            t = tilts[k]
            n3 = np.array([n[0], n[1], 0.0])
            u3 = np.array([u[0], u[1], 0.0])
            N = norm(np.sin(t) * n3 + np.cos(t) * V - 0.2 * u3)
            # Soft falloff toward the tip, as a bevelled point turns away from the light.
            tone[m] = shade(N) * (1.02 - 0.12 * l2[m])
            alpha[m] = 1.0
            s = seam[m]
            s[np.minimum(l0[m], l1[m]) < 0.02] = 1 if k in (1, 2) else -1
            seam[m] = s

    # A low eight-sided pyramid where the points meet, each face lit on its own.
    hub = 0.105 * S
    ang = np.arctan2(yy - cy, xx - cx)
    rad = np.hypot(xx - cx, yy - cy)
    a_mod = np.mod(ang + np.pi / 8, np.pi / 4) - np.pi / 8
    oct_r = hub * np.cos(np.pi / 8) / np.cos(a_mod)
    inside = rad <= oct_r
    face = np.round((ang) / (np.pi / 4)) * (np.pi / 4)
    for f in np.unique(face[inside]):
        m = inside & (face == f)
        N = norm(np.array([np.cos(f) * 0.34, np.sin(f) * 0.34, 1.0]))
        tone[m] = shade(N)
    edge = inside & (np.abs(a_mod) > np.pi / 8 - 0.012 * S / np.maximum(rad, 1))
    tone[edge] += 0.08
    alpha[inside] = 1.0
    seam[inside] = 0

    # Ridges catch a thin line of light; outer bevels sit in a fine shadow line.
    tone = np.where(seam > 0, tone + 0.12, tone)
    tone = np.where(seam < 0, tone * 0.72, tone)

    # Glass-bead blasted grain: fine, even matte texture with sparse bright specks
    # (tiny dimples catching the light) that are brighter where the surface faces it.
    grain = rng.normal(0, 0.06, (S, S))
    specks = (rng.random((S, S)) < 0.004) * rng.uniform(0.15, 0.4, (S, S)) * np.clip(tone, 0, 1)
    tone = tone + grain + specks

    rgb = colourise(tone)
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA").resize((OUT, OUT), Image.LANCZOS)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "..", "public", "stars")
    os.makedirs(out_dir, exist_ok=True)
    for i, v in enumerate(VARIANTS, 1):
        img = render(v["light"], v["seed"])
        path = os.path.join(out_dir, f"white-gold-star-{i}.webp")
        img.save(path, quality=90, method=6)
        print("wrote", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
