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
// Snowflake (viewBox 0 0 100 100, centre 50,50)
// ---------------------------------------------------------------------------

/** Radius of the frosted glass plate, as a share of the snowflake box (58% wide). */
export const PLATE_RADIUS = 29;

const ARMS = [-90, -30, 30, 90, 150, 210];
const SPINE_START = 28;
const SPINE_END = 47;
const BRANCHES = [
  { at: 34, len: 9.5 },
  { at: 41, len: 6 },
];
const BRANCH_ANGLE = 52;

/** The silhouette: six arms, each with two pairs of branches and a diamond tip. */
export function snowflakePath(): string {
  const parts: string[] = [];
  const pt = ([x, y]: [number, number]) => `${r2(x)} ${r2(y)}`;
  for (const a of ARMS) {
    parts.push(`M${pt(polar(SPINE_START, a))}L${pt(polar(SPINE_END - 2.5, a))}`);
    for (const b of BRANCHES) {
      const base = polar(b.at, a);
      for (const side of [-1, 1]) {
        const d = a + side * BRANCH_ANGLE;
        const tip: [number, number] = [base[0] + b.len * Math.cos(rad(d)), base[1] + b.len * Math.sin(rad(d))];
        parts.push(`M${pt(base)}L${pt(tip)}`);
      }
    }
    // Diamond tip
    const back = polar(SPINE_END - 3, a);
    const front = polar(SPINE_END + 1.5, a);
    const mid = polar(SPINE_END - 0.8, a);
    const px = Math.cos(rad(a + 90)) * 1.9;
    const py = Math.sin(rad(a + 90)) * 1.9;
    parts.push(
      `M${pt(back)}L${pt([mid[0] + px, mid[1] + py])}L${pt(front)}L${pt([mid[0] - px, mid[1] - py])}Z`,
    );
  }
  return parts.join("");
}

/** Lights along each arm, at every branch tip, and a ring around the plate. */
export function snowflakeLights(seed: number): LightPoint[] {
  const rand = seededRandom(seed);
  const out: LightPoint[] = [];
  const add = ([x, y]: [number, number]) => out.push({ x: r2(x), y: r2(y), ...twinkle(rand) });
  for (const a of ARMS) {
    add(polar(31, a));
    add(polar(37.5, a));
    add(polar(44, a));
    add(polar(SPINE_END + 1.5, a));
    for (const b of BRANCHES) {
      const base = polar(b.at, a);
      for (const side of [-1, 1]) {
        const d = a + side * BRANCH_ANGLE;
        add([base[0] + b.len * Math.cos(rad(d)), base[1] + b.len * Math.sin(rad(d))]);
      }
    }
    add(polar(PLATE_RADIUS + 1.6, a + 30));
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
  /** Narrow screens (below 768px): all flakes in one row, alternating short/long ribbons. */
  xNarrow: number;
  ribbonNarrow: number;
  /** Wide screens: half the flakes on each side of the logo, inner ones hang lower. */
  xWide: number;
  ribbonWide: number;
}

export function placeTabs(count: number): TabPlacement[] {
  const NARROW = { short: 10, long: 62 };
  const WIDE = { short: 16, long: 66 };
  const left = Math.ceil(count / 2);
  const right = count - left;

  const spread = (n: number, from: number, to: number) =>
    n === 1 ? [(from + to) / 2] : Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

  const leftX = spread(left, 10, 36);
  const rightX = spread(right, 64, 90);
  // Inner flakes (nearest the logo) hang lowest, framing it in a soft V.
  const ribbonFor = (j: number, n: number, innerIsLast: boolean) => {
    if (n === 1) return WIDE.long;
    const k = innerIsLast ? j / (n - 1) : 1 - j / (n - 1);
    return Math.round(WIDE.short + (WIDE.long - WIDE.short) * k);
  };

  return Array.from({ length: count }, (_, i) => {
    const isLeft = i < left;
    const j = isLeft ? i : i - left;
    return {
      xNarrow: r2(((i + 0.5) / count) * 100),
      ribbonNarrow: i % 2 === 0 ? NARROW.short : NARROW.long,
      xWide: isLeft ? r2(leftX[j]) : r2(rightX[j]),
      ribbonWide: isLeft ? ribbonFor(j, left, true) : ribbonFor(j, right, false),
    };
  });
}
