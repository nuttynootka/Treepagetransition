"""Draws the faceted 8-point crystal star pictures used as the menu tabs.

Shape: the north star from the Noble Star Forest sign (tall top point, longer bottom
point), with the side and diagonal points lengthened so they show past the glass
centre. Facets: like a cut-crystal star ornament, each point is cut into four long
facets meeting at a ridge, so one half catches the light and the other falls dark.

Run:  python3 scripts/make-crystal-stars.py
Writes public/stars/crystal-star-1.webp ... -3.webp (440 x 440, transparent).
Keep ARMS and CENTRE_Y in step with STAR_ARMS in components/garland-header/geometry.ts.
"""

import os
import numpy as np
from PIL import Image

OUT = 440
SS = 4  # supersampling
S = OUT * SS
CENTRE_Y = 0.40  # star centre, as a share of the box height (the glass centre sits here)

# (angle in degrees, 0 = right, 90 = down; length; half-width at the root), as shares of the box
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


def norm(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def render(light, seed):
    rng = np.random.default_rng(seed)
    L = norm(light)
    V = np.array([0, 0, 1.0])
    rgb = np.zeros((S, S), float)
    alpha = np.zeros((S, S), float)
    edges = np.zeros((S, S), float)  # +1 bright edge, -1 dark seam
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    cx, cy = S * 0.5, S * CENTRE_Y

    for deg, length, half in ARMS:
        a = np.radians(deg)
        u = np.array([np.cos(a), np.sin(a)])  # along the point
        n = np.array([-np.sin(a), np.cos(a)])  # across it
        tip = np.array([cx, cy]) + u * length * S
        w = half * S
        root = np.array([cx, cy]) - u * w * 0.4
        # Four facets across the point: outer-left, inner-left, inner-right, outer-right.
        offs = [-1.0, -0.45, 0.0, 0.45, 1.0]
        tilts = [-1.05, -0.5, 0.5, 1.05]  # how far each facet leans away from flat
        for k in range(4):
            p0 = root + n * w * offs[k]
            p1 = root + n * w * offs[k + 1]
            # barycentric mask for triangle p0, p1, tip
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
            N = norm(np.sin(t) * n3 + np.cos(t) * np.array([0, 0, 1.0]) - 0.22 * u3)
            diff = max(0.0, N @ L)
            R = 2 * (N @ L) * N - L
            spec = max(0.0, R @ V) ** 18
            base = 0.3 + 0.85 * diff ** 1.4 + 0.9 * spec
            # Along the facet: a little brighter toward the tip, with one dark refraction streak.
            along = l2[m]
            s = rng.uniform(0.25, 0.75)
            streak = 1 - 0.55 * np.exp(-(((along - s) / 0.06) ** 2))
            # A bright flash of white near the base of some facets, as clear crystal throws back light.
            flash = 0.5 * np.exp(-(((along - rng.uniform(0.05, 0.3)) / 0.08) ** 2)) * (rng.random() < 0.5)
            tone = np.clip(base * (0.8 + 0.4 * along) * streak + flash, 0, 1.2)
            rgb[m] = tone
            alpha[m] = 0.94
            # Seams between facets (dark) and the ridge / outer edges (bright).
            seam = np.minimum(l0[m], l1[m]) < 0.035
            e = edges[m]
            e[seam] = 1 if k in (1, 2) else -0.6
            edges[m] = e

    rgb = np.where(edges > 0, np.maximum(rgb, 1.05), rgb)
    rgb = np.where(edges < 0, rgb * 0.55, rgb)
    # Slightly cool clear crystal.
    out = np.dstack([rgb * 236, rgb * 242, rgb * 250, alpha * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, "RGBA").resize((OUT, OUT), Image.LANCZOS)
    return img


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "..", "public", "stars")
    os.makedirs(out_dir, exist_ok=True)
    for i, v in enumerate(VARIANTS, 1):
        img = render(v["light"], v["seed"])
        path = os.path.join(out_dir, f"crystal-star-{i}.webp")
        img.save(path, quality=90, method=6)
        print("wrote", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
