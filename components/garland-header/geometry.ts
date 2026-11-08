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
    const color: GlintColor = c < 0.65 ? "white" : "gold";
    const kind = rand() < 0.25 ? "star" : "fleck";
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
 * Light caught by the menu's glass plates: white and warm gold, alternating.
 * Plain RGB numbers, used as rgb(var(--gc)).
 */
export const PLATE_LIGHT_COLORS = [
  "255 250 240", // white
  "255 206 120", // warm gold
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
// Crystal star tabs (keep in step with scripts/make-crystal-stars.py)
// ---------------------------------------------------------------------------

/** Where the star's points meet, as a share of the box height. The glass centre sits here. */
export const STAR_CENTRE_Y = 0.4;
/** [angle in degrees (0 = right, 90 = down), length as a share of the box]. */
export const STAR_ARMS: [number, number][] = [
  [-135, 0.31], [-45, 0.31], [45, 0.29], [135, 0.29],
  [180, 0.36], [0, 0.36], [-90, 0.39], [90, 0.58],
];

/** Glints along the star's points, past the glass centre, mostly toward the tips. */
export function starGlints(seed: number, count = 12): Glint[] {
  const rand = seededRandom(seed);
  const out: Glint[] = [];
  for (let i = 0; i < count; i++) {
    const [deg, len] = STAR_ARMS[Math.floor(rand() * STAR_ARMS.length)];
    const r = len * (0.45 + rand() * 0.5) * 100;
    const x = 50 + r * Math.cos(rad(deg));
    const y = STAR_CENTRE_Y * 100 + r * Math.sin(rad(deg));
    const c = rand();
    const color: GlintColor = c < 0.65 ? "white" : "gold";
    const kind = rand() < 0.3 ? "star" : "fleck";
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
  // Three or fewer: the middle star hangs just under the sign (which reaches half a garland
  // thickness below the garland), and the side stars just under the garland.
  const underSign = "calc(var(--sign-h) / 2 - var(--g) / 2 + 5px)";
  const underGarland = "calc(var(--g) * 0.4 + 3px)"; // the foliage hangs about 0.4 g below the garland band
  const oneRowRibbon = (i: number) => (count === 3 && i === 1 ? underSign : underGarland);
  const narrowRibbon = (row: number, i = 0) =>
    count <= 3 ? oneRowRibbon(i) : row === 0 ? "8px" : `calc(8px + ${ROW_STEP} * ${row})`;

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
  // The sign reaches half a garland-thickness below the garland, so on phones every
  // snowflake hangs clear of it, and on computers the middle one does.
  const oneRow = count <= 3;
  const rowX = spread(count, 20, 80);

  const tabs = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const col = i - row * cols;
    const isLeft = i < left;
    const j = isLeft ? i : i - left;
    return {
      xNarrow: r2(((col + 0.5) / inRow) * 100),
      ribbonNarrow: narrowRibbon(row, i),
      xWide: oneRow ? r2(rowX[i]) : isLeft ? r2(leftX[j]) : r2(rightX[j]),
      ribbonWide: oneRow ? oneRowRibbon(i) : isLeft ? waveFor(j) : waveFor(right - 1 - j),
      layer: Math.max(1, 5 - row),
    };
  });
  const maxWide = oneRow
    ? count === 3
      ? underSign
      : underGarland
    : `${Math.max(0, ...tabs.map((t) => parseInt(t.ribbonWide, 10)))}px`;
  const maxNarrow = count === 3 ? underSign : narrowRibbon(rows - 1, Math.min(1, count - 1));
  return { tabs, maxNarrow, maxWide };
}
