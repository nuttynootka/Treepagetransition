// Paints a lush garland of noble fir and western red cedar onto a canvas.
//
// Noble fir: stiff sprigs with dense, short, blue-green to silvery needles that
// curve upward ("hockey stick"), so the top of each sprig looks brushy.
// Western red cedar: flat, fern-like sprays of bright yellow-green, branching in
// one plane, drooping at the tips, on orange-brown stems.
//
// Everything is seeded, so the garland looks the same on every visit, and it is
// drawn back to front in layers (dark and shadowed at the back, bright in front).

import { seededRandom } from "./geometry";

type Rand = () => number;

interface Layer {
  kind: "fir" | "cedar";
  /** Sprigs per 100px of width. */
  density: number;
  /** 0 = deep shadow, 1 = fully lit. */
  light: number;
  /** Sprig length, as a share of the garland thickness. */
  len: [number, number];
}

const LAYERS: Layer[] = [
  { kind: "fir", density: 6.5, light: 0.42, len: [0.75, 1.05] },
  { kind: "cedar", density: 3, light: 0.55, len: [0.9, 1.25] },
  { kind: "fir", density: 6, light: 0.68, len: [0.65, 0.95] },
  { kind: "cedar", density: 2.2, light: 0.82, len: [0.8, 1.15] },
  { kind: "fir", density: 5, light: 0.92, len: [0.55, 0.85] },
  { kind: "cedar", density: 1.8, light: 1, len: [0.7, 1.0] },
  { kind: "fir", density: 2.6, light: 1, len: [0.45, 0.7] },
];

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(1)}%,${a})`;

/**
 * Draw the garland. `width` and `height` are CSS pixels; `thickness` is the
 * garland band's thickness (the canvas is taller so sprigs can spill over).
 */
export function paintGarland(ctx: CanvasRenderingContext2D, width: number, height: number, thickness: number, seed = 1225) {
  const rand = seededRandom(seed);
  const cy = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Dark core, so no gaps show between sprigs.
  for (let x = -thickness; x < width + thickness; x += thickness * 0.35) {
    const r = thickness * (0.38 + rand() * 0.12);
    const y = cy + (rand() - 0.5) * thickness * 0.15;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(10,28,20,0.95)");
    g.addColorStop(1, "rgba(10,28,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (const layer of LAYERS) {
    const count = Math.ceil(((width + thickness * 2) / 100) * layer.density);
    for (let i = 0; i < count; i++) {
      const x = -thickness + rand() * (width + thickness * 2);
      const len = thickness * (layer.len[0] + rand() * (layer.len[1] - layer.len[0]));
      if (layer.kind === "fir") {
        const y = cy + (rand() - 0.5) * thickness * 0.6;
        // Mostly lying along the garland, pointing left, with some variety.
        const angle = Math.PI + (rand() - 0.5) * 1.0 + (rand() < 0.15 ? Math.PI * 0.85 : 0);
        drawFir(ctx, x, y, angle, len, layer.light, rand, thickness);
      } else {
        // Most cedar sprays point down and out, drooping below the garland;
        // some lie along the top, tucked in among the fir.
        const r = rand();
        const along = r < 0.3;
        const y = along ? cy - thickness * (0.15 + rand() * 0.2) : cy + (rand() - 0.6) * thickness * 0.5;
        const angle = along
          ? (rand() < 0.5 ? Math.PI : 0) + (rand() - 0.5) * 0.5
          : Math.PI * (r < 0.65 ? 0.62 + rand() * 0.2 : 0.18 + rand() * 0.2);
        drawCedar(ctx, x, y, angle, len, layer.light, rand, thickness);
      }
    }
  }

  // Soft shading: a little darker along the bottom, as if lit from above.
  const shade = ctx.createLinearGradient(0, cy - thickness * 0.7, 0, cy + thickness * 0.8);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.55, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,8,4,0.45)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
}

// ---------------------------------------------------------------------------

/** A gently curved stem: returns point and direction at t (0..1). */
function stem(x: number, y: number, angle: number, len: number, bend: number, droop: number) {
  return (t: number) => {
    const a = angle + bend * t + droop * t * t;
    // Integrate roughly: position from average angle so far.
    const am = angle + (bend * t) / 2 + (droop * t * t) / 3;
    return { x: x + Math.cos(am) * len * t, y: y + Math.sin(am) * len * t, a };
  };
}

function drawFir(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, light: number, rand: Rand, thick: number) {
  const s = thick / 80; // scale
  const path = stem(x, y, angle, len, (rand() - 0.5) * 0.5, 0);
  // Needle colours: blue-green to silvery, a few darker.
  const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  const colours = [
    hsl(152, 34, 15 * light + 4),
    hsl(150, 28, 24 * light + 4),
    hsl(158, 22, 34 * light + 5),
    hsl(168, 16, 50 * light + 5), // silvery undersides catching light
  ];
  const addNeedles = (along: (t: number) => { x: number; y: number; a: number }, length: number, needleLen: number, from: number) => {
    const n = Math.max(6, Math.floor(length / (2.3 * s)));
    for (let k = 0; k < n; k++) {
      const t = from + (k / n) * (1 - from);
      const p = along(t);
      const nl = needleLen * (1 - 0.45 * t) * (0.8 + rand() * 0.4);
      for (const side of [-1, 1]) {
        // Needles leave the stem at ~65°, then curve upward on screen.
        const out = p.a + side * (1.1 + (rand() - 0.5) * 0.35);
        const ux = Math.cos(out);
        const uy = Math.sin(out);
        const tipX = p.x + ux * nl;
        const tipY = p.y + uy * nl - nl * 0.28;
        const cx = p.x + ux * nl * 0.6;
        const cy = p.y + uy * nl * 0.6 - nl * 0.05;
        // Needles near the base sit in shadow; upper-side needles near the tip catch the light.
        const lit = rand() * 2.2 + t * 1.2 + (uy < 0 ? 0.5 : -0.3);
        const b = buckets[Math.max(0, Math.min(3, Math.floor(lit)))];
        b.moveTo(p.x, p.y);
        b.quadraticCurveTo(cx, cy, tipX, tipY);
      }
    }
  };

  // Soft shadow under the sprig, for depth between layers.
  ctx.strokeStyle = "rgba(0,10,6,0.32)";
  ctx.lineWidth = 16 * s;
  ctx.beginPath();
  for (let t = 0; t <= 1.0001; t += 0.2) {
    const p = path(t);
    if (t === 0) ctx.moveTo(p.x, p.y + 4 * s);
    else ctx.lineTo(p.x, p.y + 4 * s);
  }
  ctx.stroke();

  // Stem
  ctx.strokeStyle = hsl(30, 25, 18 * light + 6);
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  for (let t = 0; t <= 1.0001; t += 0.1) {
    const p = path(t);
    if (t === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  addNeedles(path, len, 11 * s, 0.04);
  // Side shoots
  const shoots = 2 + Math.floor(rand() * 3);
  for (let k = 0; k < shoots; k++) {
    const t = 0.2 + rand() * 0.5;
    const p = path(t);
    const side = k % 2 ? 1 : -1;
    const sl = len * (0.35 + rand() * 0.2);
    const sp = stem(p.x, p.y, p.a + side * (0.55 + rand() * 0.3), sl, (rand() - 0.5) * 0.3, 0);
    addNeedles(sp, sl, 9 * s, 0.05);
  }

  ctx.lineWidth = 0.95 * s;
  buckets.forEach((b, k) => {
    ctx.strokeStyle = colours[k];
    ctx.stroke(b);
  });
}

function drawCedar(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, light: number, rand: Rand, thick: number) {
  const s = thick / 80;
  // Sprays droop toward the ground as they grow.
  const towardDown = Math.cos(angle) > 0 ? 0.6 : -0.6;
  const axis = stem(x, y, angle, len, (rand() - 0.5) * 0.3, towardDown * 0.5);
  const dark = hsl(95, 52, 17 * light + 4);
  const mid = hsl(88, 60, 30 * light + 5);
  const bright = hsl(80, 66, 42 * light + 6);

  // Orange-brown main stem, fading to green toward the tip.
  ctx.lineWidth = 1.4 * s;
  for (let t = 0; t < 1; t += 0.1) {
    const a = axis(t);
    const b = axis(t + 0.1);
    ctx.strokeStyle = t < 0.35 ? hsl(22, 45, 24 * light + 8) : dark;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Flat, alternating branchlets with smaller ones off them, all in one plane.
  const frond = (along: (t: number) => { x: number; y: number; a: number }, length: number, depth: number) => {
    const steps = Math.max(3, Math.floor(length / ((depth === 0 ? 5.5 : 4) * s)));
    for (let k = 1; k <= steps; k++) {
      const t = k / (steps + 1);
      const p = along(t);
      const side = k % 2 ? 1 : -1;
      const bl = length * (depth === 0 ? 0.3 : depth === 1 ? 0.42 : 0.5) * (1 - 0.55 * t) * (0.85 + rand() * 0.3);
      const ba = p.a + side * (0.85 + (rand() - 0.5) * 0.25);
      const br = stem(p.x, p.y, ba, bl, -side * 0.25, towardDown * 0.3);
      // Braided scale-leaves: a darker edge, then a lighter centre.
      const w = [2.2, 1.7, 1.3][depth];
      ctx.lineWidth = w * s;
      ctx.strokeStyle = dark;
      strokeAlong(ctx, br);
      ctx.lineWidth = w * 0.55 * s;
      ctx.strokeStyle = rand() < 0.35 ? bright : mid;
      strokeAlong(ctx, br);
      if (depth < 2 && bl > 7 * s) frond(br, bl, depth + 1);
    }
  };
  frond(axis, len, 0);

  // Bright new-growth tip.
  const tip = axis(1);
  ctx.fillStyle = bright;
  ctx.beginPath();
  ctx.ellipse(tip.x, tip.y, 1.6 * s, 1.1 * s, tip.a, 0, Math.PI * 2);
  ctx.fill();
}

function strokeAlong(ctx: CanvasRenderingContext2D, along: (t: number) => { x: number; y: number }) {
  ctx.beginPath();
  for (let t = 0; t <= 1.0001; t += 0.25) {
    const p = along(t);
    if (t === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}
