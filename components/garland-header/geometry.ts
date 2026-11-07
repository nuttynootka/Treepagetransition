// Positions for every fairy light, snowflake line and frost crystal.
// Everything is seeded (no Math.random), so the server and the browser
// draw exactly the same thing and React hydration never mismatches.

export interface LightPoint {
  /** Percent of the parent box, 0–100. */
  x: number;
  y: number;
  /** Twinkle cycle in seconds (1.5–3s). */
  dur: number;
  /** Negative start offset so lights are out of step from the first frame. */
  delay: number;
  /** Hidden on phones to keep the strand from looking crowded. */
  dense?: boolean;
}

/** Small, fast seeded random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a string (like a page label) into a seed. */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Round to 2 decimals so server and browser print identical style strings. */
const r2 = (n: number) => Math.round(n * 100) / 100;

function twinkle(rand: () => number) {
  const dur = 1.5 + rand() * 1.5;
  return { dur: r2(dur), delay: r2(-rand() * dur) };
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number): [number, number] => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))];

// ---------------------------------------------------------------------------
// Garland strand
// ---------------------------------------------------------------------------

/**
 * Two light strands woven through the garland, like a real wire wrapped
 * around greenery. Strand B is marked `dense` and hidden on phones.
 */
export function garlandLights(seed = 7): LightPoint[] {
  const rand = seededRandom(seed);
  const out: LightPoint[] = [];
  const strand = (count: number, freq: number, phase: number, amp: number, dense: boolean) => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5 + (rand() - 0.5) * 0.6) / count;
      const y = 50 + amp * Math.sin(t * Math.PI * 2 * freq + phase) + (rand() - 0.5) * 12;
      out.push({ x: r2(t * 100), y: r2(Math.min(84, Math.max(16, y))), dense, ...twinkle(rand) });
    }
  };
  strand(34, 6.5, 0.4, 24, false);
  strand(26, 4.5, 2.1, 20, true);
  return out;
}

/** Lights spaced evenly around the logo's oval frame. */
export function ovalLights(count = 24, seed = 11): LightPoint[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const deg = (i / count) * 360 + (rand() - 0.5) * 4;
    return { x: r2(50 + 50 * Math.cos(rad(deg))), y: r2(50 + 50 * Math.sin(rad(deg))), ...twinkle(rand) };
  });
}

// ---------------------------------------------------------------------------
// Crystal glints (percent of the snowflake box, centre 50,50)
// ---------------------------------------------------------------------------

/** The six arm directions of the crystal pictures (one arm points straight up). */
const ARMS = [-90, -30, 30, 90, 150, 210];

/** Colours of light caught in the crystal: mostly white, some from coloured Christmas lights. */
export const GLINT_COLORS = {
  white: "255 248 240",
  gold: "255 214 140",
  red: "255 92 92",
  green: "92 255 150",
} as const;
export type GlintColor = keyof typeof GLINT_COLORS;

export interface Glint {
  x: number;
  y: number;
  /** "star" has crossed rays; "fleck" is a small coloured point of refracted light. */
  kind: "star" | "fleck";
  color: GlintColor;
  /** Size as a share of the snowflake box. */
  size: number;
  dur: number;
  delay: number;
  /** Shown while the snowflake is inactive too (the rest only sparkle when active). */
  rest: boolean;
}

/** Glints scattered over the crystal arms and branches, never on the glass plate. */
export function crystalGlints(seed: number, plate: number, count = 18): Glint[] {
  const rand = seededRandom(seed);
  const innerR = plate * 50 + 3;
  const out: Glint[] = [];
  for (let i = 0; i < count; i++) {
    const onArm = rand() < 0.7;
    const arm = ARMS[Math.floor(rand() * ARMS.length)];
    const deg = onArm ? arm + (rand() - 0.5) * 16 : arm + 30 + (rand() - 0.5) * 24;
    const r = innerR + rand() * (46 - innerR);
    const [x, y] = polar(r, deg);
    const c = rand();
    const color: GlintColor = c < 0.58 ? "white" : c < 0.72 ? "gold" : c < 0.86 ? "red" : "green";
    const kind = rand() < 0.4 ? "star" : "fleck";
    const dur = kind === "star" ? 2.6 + rand() * 2.2 : 1.6 + rand() * 1.4;
    out.push({
      x: r2(x),
      y: r2(y),
      kind,
      color,
      size: r2(kind === "star" ? 0.16 + rand() * 0.1 : 0.05 + rand() * 0.035),
      dur: r2(dur),
      delay: r2(-rand() * dur),
      rest: i % 2 === 0,
    });
  }
  return out;
}

/**
 * Christmas-light colours caught by the menu's glass plates, one per plate, in order.
 * Plain RGB numbers, used as rgb(var(--gc)).
 */
export const PLATE_LIGHT_COLORS = [
  "255 70 70", // red
  "70 225 120", // green
  "255 196 80", // gold
  "90 150 255", // blue
  "255 132 56", // orange
  "205 110 255", // violet
];

export interface PlateGlint {
  /** Percent of the plate box. */
  x: number;
  y: number;
  kind: "star" | "fleck";
  /** Size in px. */
  size: number;
  dur: number;
  delay: number;
}

/** A few glints along a plate's edges and bevel, where light catches glass. */
export function plateGlints(seed: number): PlateGlint[] {
  const rand = seededRandom(seed);
  const out: PlateGlint[] = [];
  const edgePoint = () => {
    const side = rand();
    if (side < 0.38) return { x: 6 + rand() * 88, y: 6 + rand() * 6 }; // top edge
    if (side < 0.76) return { x: 6 + rand() * 88, y: 88 + rand() * 6 }; // bottom bevel
    return { x: side < 0.88 ? 3 + rand() * 3 : 94 + rand() * 3, y: 20 + rand() * 60 }; // ends
  };
  for (let i = 0; i < 6; i++) {
    const kind = i < 2 ? "star" : "fleck";
    const { x, y } = edgePoint();
    const dur = kind === "star" ? 2.8 + rand() * 2.2 : 1.6 + rand() * 1.4;
    out.push({
      x: r2(x),
      y: r2(y),
      kind,
      size: r2(kind === "star" ? 14 + rand() * 8 : 4 + rand() * 3),
      dur: r2(dur),
      delay: r2(-rand() * dur),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Frost crystals for the glass plate (viewBox 0 0 100 100, circle r=50)
// ---------------------------------------------------------------------------

export interface FrostStroke {
  d: string;
  /** Seconds after the bloom starts. */
  delay: number;
  width: number;
}

/**
 * Dendrite-style frost: crystals start at the rim and grow inward, with side
 * branches at 60°, like frost creeping across a cold window.
 */
export function frostStrokes(seed: number): FrostStroke[] {
  const rand = seededRandom(seed);
  const out: FrostStroke[] = [];
  const seeds = 7;
  for (let i = 0; i < seeds; i++) {
    const rimDeg = (i / seeds) * 360 + (rand() - 0.5) * 36;
    const start = polar(49, rimDeg);
    let dir = rimDeg + 180 + (rand() - 0.5) * 30;
    const len = 18 + rand() * 13;
    const segs = 3;
    const pts: [number, number][] = [start];
    for (let s = 0; s < segs; s++) {
      dir += (rand() - 0.5) * 16;
      const [x, y] = pts[pts.length - 1];
      pts.push([x + (len / segs) * Math.cos(rad(dir)), y + (len / segs) * Math.sin(rad(dir))]);
    }
    const lineD = (p: [number, number][]) => p.map((q, k) => `${k ? "L" : "M"}${r2(q[0])} ${r2(q[1])}`).join("");
    const startDelay = r2(rand() * 0.2);
    out.push({ d: lineD(pts), delay: startDelay, width: 0.8 });

    // Side branches along the main crystal.
    for (const f of [0.3, 0.55, 0.78]) {
      const idx = Math.min(segs - 1, Math.floor(f * segs));
      const a = pts[idx];
      const b = pts[idx + 1];
      const local = f * segs - idx;
      const base: [number, number] = [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
      const segDir = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      const bl = len * (1 - f) * (0.45 + rand() * 0.2);
      for (const side of [-1, 1]) {
        const d = segDir + side * 60;
        const tip: [number, number] = [base[0] + bl * Math.cos(rad(d)), base[1] + bl * Math.sin(rad(d))];
        out.push({ d: lineD([base, tip]), delay: r2(startDelay + 0.18 + f * 0.4), width: 0.5 });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Where each snowflake hangs
// ---------------------------------------------------------------------------

export interface TabPlacement {
  /**
   * Phones and tablets (below 1024px): a grid of rows, up to 3 across. Each row hangs
   * one snowflake-height lower, so the ribbon is a CSS length that depends on --flake.
   */
  xNarrow: number;
  ribbonNarrow: string;
  /** Computers (1024px and up): half the flakes on each side of the logo, in a gentle wave. */
  xWide: number;
  ribbonWide: string;
  /** Upper rows sit in front, so lower rows' ribbons pass behind them. */
  layer: number;
}

export interface TabLayout {
  tabs: TabPlacement[];
  /** The longest ribbon in each layout, used to size the header. */
  maxNarrow: string;
  maxWide: string;
}

const ROW_STEP = "(var(--flake) + 14px)";

export function placeTabs(count: number): TabLayout {
  // Narrow: up to 3 per row.
  const cols = count <= 3 ? count : Math.min(3, Math.ceil(count / 2));
  const rows = Math.ceil(count / cols);
  const narrowRibbon = (row: number) => (row === 0 ? "8px" : `calc(8px + ${ROW_STEP} * ${row})`);

  // Wide: left side gets the extra one when the count is odd.
  const left = Math.ceil(count / 2);
  const right = count - left;
  const spread = (n: number, from: number, to: number) =>
    n === 1 ? [(from + to) / 2] : Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
  const leftX = spread(left, 7, 37);
  const rightX = spread(right, 63, 93);
  // Outer to inner: a soft wave, mirrored on the right.
  const WAVE = [20, 70, 36, 60];
  const waveFor = (fromOuter: number) => `${WAVE[fromOuter % WAVE.length]}px`;

  // Three or fewer: one row, spread evenly, the middle one hanging under the logo.
  const oneRow = count <= 3;
  const rowX = spread(count, 20, 80);
  const rowRibbon = (i: number) => (count === 3 && i === 1 ? "42px" : "24px");

  const tabs = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const col = i - row * cols;
    const isLeft = i < left;
    const j = isLeft ? i : i - left;
    return {
      xNarrow: r2(((col + 0.5) / inRow) * 100),
      ribbonNarrow: narrowRibbon(row),
      xWide: oneRow ? r2(rowX[i]) : isLeft ? r2(leftX[j]) : r2(rightX[j]),
      ribbonWide: oneRow ? rowRibbon(i) : isLeft ? waveFor(j) : waveFor(right - 1 - j),
      layer: Math.max(1, 5 - row),
    };
  });
  const maxWidePx = Math.max(0, ...tabs.map((t) => parseInt(t.ribbonWide, 10)));
  return { tabs, maxNarrow: narrowRibbon(rows - 1), maxWide: `${maxWidePx}px` };
}
