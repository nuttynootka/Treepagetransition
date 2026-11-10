// Positions for the fairy lights and the glints on the plates.
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
  // On the silver rim and the darker lower edge of the plate, where a pinpoint of light shows.
  // On the pale glass itself it would disappear.
  const edgePoint = () => {
    const side = rand();
    if (side < 0.3) return { x: 6 + rand() * 88, y: 1 + rand() * 3 }; // top rim
    if (side < 0.85) return { x: 6 + rand() * 88, y: 100 + rand() * 7 }; // dark lower edge
    return { x: side < 0.92 ? 0.5 + rand() * 1.5 : 98 + rand() * 1.5, y: 25 + rand() * 50 }; // end rims
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
// Where the three tabs hang
// ---------------------------------------------------------------------------

export interface TabPlacement {
  /** Horizontal position as a percent of the header width: phones and tablets (below 1024px). */
  xNarrow: number;
  /** Horizontal position as a percent of the header width: computers (1024px and up). */
  xWide: number;
  /** How far the chains reach below the garland band, as a CSS length (narrow, then wide). */
  ribbonNarrow: string;
  ribbonWide: string;
  /** Stacking order. */
  layer: number;
}

export interface TabLayout {
  tabs: TabPlacement[];
  /** The longest chain, used to size the header. */
  maxNarrow: string;
  maxWide: string;
}

/**
 * Left, centre and right slots. The centre plate hangs just under the sign (which reaches below
 * the garland); the side plates hang just under the garland's foliage, which droops about
 * 0.4 of the garland's thickness below its edge.
 */
export function placeTabs(): TabLayout {
  const underSign = "calc(var(--sign-h) / 2 - var(--g) / 2 + 5px)";
  const underGarland = "calc(var(--g) * 0.4 + 9px)";
  const slot = (xNarrow: number, xWide: number, ribbon: string): TabPlacement => ({
    xNarrow,
    xWide,
    ribbonNarrow: ribbon,
    ribbonWide: ribbon,
    layer: 1,
  });
  return {
    tabs: [slot(16.67, 20, underGarland), slot(50, 50, underSign), slot(83.33, 80, underGarland)],
    maxNarrow: underSign,
    maxWide: underSign,
  };
}
