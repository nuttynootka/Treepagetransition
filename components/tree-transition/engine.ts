/**
 * Fairy-Tale Wand Christmas Tree transition: the canvas engine.
 *
 * This file has no React or Next.js code in it. The React provider
 * (TreeTransitionProvider.tsx) creates one engine and calls:
 *   engine.start({ origin })  when a link is clicked or tapped
 *   engine.reveal()           when the new page has mounted
 * The engine calls `onNavigate` when it is time to change the route,
 * and `onDone` when the overlay is fully gone.
 *
 * Timeline (default values, see TIMING):
 *   0ms      overlay appears, background starts fading to black
 *   0-200    "summon": sparks fly from the tap point to the tree base
 *   200-1100 the wand spirals up and leaves ~1,800 fixed white lights
 *   1100     star lights up at the peak, red/green splash; overlay is fully black
 *   1300     onNavigate() is called (route change happens under the overlay)
 *   mount    reveal(): lights drift and fade, overlay fades out over 500ms
 */

export interface TransitionOrigin {
  x: number;
  y: number;
}

export interface StartOptions {
  /** Where the user clicked or tapped, in viewport pixels. */
  origin?: TransitionOrigin | null;
  /** Use a short plain fade instead of the full animation. */
  reducedMotion?: boolean;
}

export interface EngineOptions {
  overlay: HTMLElement;
  trailCanvas: HTMLCanvasElement;
  lightsCanvas: HTMLCanvasElement;
  onNavigate: () => void;
  onDone?: () => void;
  /** Number of white tree lights. Default 1800. */
  particleCount?: number;
}

export const TIMING = {
  summon: 200, // tap-point sparks travel to the tree base
  draw: 900, // wand travels from base to peak
  navDelay: 200, // route change this long after the star splash starts
  dissolve: 500, // lights and overlay fade out after the new page mounts
  routeTimeout: 4000, // reveal anyway if the new page never reports in
  reducedIn: 220, // reduced-motion fade in
  reducedOut: 300, // reduced-motion fade out
};

type Phase =
  | "idle"
  | "build"
  | "waiting"
  | "dissolve"
  | "reduced-in"
  | "reduced-wait"
  | "reduced-out";

interface Geometry {
  w: number;
  h: number;
  cx: number;
  baseY: number;
  treeH: number;
  maxR: number;
  minDim: number;
}

interface PathPoint {
  x: number;
  y: number;
  /** -1 = back of the spiral, 1 = front (toward the viewer). */
  z: number;
  r: number;
}

const TAU = Math.PI * 2;
const MAX_SPARKS = 1400;

// Spark colours, by index: white, gold, red, green.
const SPARK_COLORS: Array<[number, number, number]> = [
  [235, 242, 255],
  [255, 214, 120],
  [255, 46, 77],
  [46, 255, 128],
];
const KIND_WHITE = 0;
const KIND_GOLD = 1;
const KIND_RED = 2;
const KIND_GREEN = 3;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** Cheap bell-curve random number centred on 0, roughly -1..1. */
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Soft round glow drawn once to a small canvas, then stamped many times. */
function makeGlow(r: number, g: number, b: number, core = 0.22): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(core, `rgba(${r},${g},${b},0.85)`);
  grd.addColorStop(0.5, `rgba(${r},${g},${b},0.2)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}

export class TreeTransitionEngine {
  private opts: EngineOptions;
  private overlay: HTMLElement;
  private trail: HTMLCanvasElement;
  private lights: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private lctx: CanvasRenderingContext2D;

  private g: Geometry = { w: 0, h: 0, cx: 0, baseY: 0, treeH: 0, maxR: 0, minDim: 0 };
  private dpr = 1;
  private phase: Phase = "idle";
  private raf = 0;
  private last = 0;
  /** Timeline clock in ms. Built from clamped frame times so a slow frame never skips a stage. */
  private clock = 0;
  private phaseStart = 0;
  private summonDur = 0;
  private starTime = -1;
  private origin: TransitionOrigin | null = null;

  // Wand path state
  private lastP = 0;
  private carry = 0;
  private prevHead: { x: number; y: number } | null = null;
  private seed = { turns: 7, phase: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 };

  // White tree lights (structure-of-arrays for speed)
  private cap: number;
  private ln = 0;
  private lx: Float32Array;
  private ly: Float32Array;
  private lvx: Float32Array;
  private lvy: Float32Array;
  private lsize: Float32Array;
  private lalpha: Float32Array;
  private lfreq: Float32Array;
  private lphase: Float32Array;
  private lbirth: Float32Array;

  // Sparks: summon trail, wand spray, red/green splash
  private sn = 0;
  private sx = new Float32Array(MAX_SPARKS);
  private sy = new Float32Array(MAX_SPARKS);
  private svx = new Float32Array(MAX_SPARKS);
  private svy = new Float32Array(MAX_SPARKS);
  private slife = new Float32Array(MAX_SPARKS);
  private smax = new Float32Array(MAX_SPARKS);
  private ssize = new Float32Array(MAX_SPARKS);
  private sgrav = new Float32Array(MAX_SPARKS);
  private sdrag = new Float32Array(MAX_SPARKS);
  private skind = new Uint8Array(MAX_SPARKS);

  private glowWhite: HTMLCanvasElement;
  private glowWarm: HTMLCanvasElement;
  private sparkSprites: HTMLCanvasElement[];

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.overlay = opts.overlay;
    this.trail = opts.trailCanvas;
    this.lights = opts.lightsCanvas;
    this.tctx = this.trail.getContext("2d")!;
    this.lctx = this.lights.getContext("2d")!;

    this.cap = Math.max(1500, opts.particleCount ?? 1800);
    this.lx = new Float32Array(this.cap);
    this.ly = new Float32Array(this.cap);
    this.lvx = new Float32Array(this.cap);
    this.lvy = new Float32Array(this.cap);
    this.lsize = new Float32Array(this.cap);
    this.lalpha = new Float32Array(this.cap);
    this.lfreq = new Float32Array(this.cap);
    this.lphase = new Float32Array(this.cap);
    this.lbirth = new Float32Array(this.cap);

    this.glowWhite = makeGlow(225, 235, 255, 0.18);
    this.glowWarm = makeGlow(255, 236, 190, 0.3);
    this.sparkSprites = SPARK_COLORS.map(([r, g, b]) => makeGlow(r, g, b, 0.25));

    this.hideOverlay();
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  /** True while any part of the transition is on screen. */
  get isActive() {
    return this.phase !== "idle";
  }

  /** True once onNavigate has been called for the current run. */
  get hasNavigated() {
    return this.phase === "waiting" || this.phase === "dissolve" || this.phase === "reduced-wait" || this.phase === "reduced-out";
  }

  /** Start a transition. Returns false if one is already running. */
  start(options: StartOptions = {}): boolean {
    if (this.phase !== "idle") return false;
    this.resize();

    this.clock = 0;
    this.phaseStart = 0;
    this.starTime = -1;
    this.ln = 0;
    this.sn = 0;
    this.lastP = 0;
    this.carry = 0;
    this.prevHead = null;
    this.origin = options.origin ?? null;
    this.summonDur = this.origin ? TIMING.summon : 0;
    this.seed = {
      turns: rand(6.4, 8.2),
      phase: rand(0, TAU),
      p1: rand(0, TAU),
      p2: rand(0, TAU),
      p3: rand(0, TAU),
      p4: rand(0, TAU),
      p5: rand(0, TAU),
      p6: rand(0, TAU),
    };

    this.tctx.clearRect(0, 0, this.g.w, this.g.h);
    this.lctx.clearRect(0, 0, this.g.w, this.g.h);

    this.overlay.style.display = "block";
    this.overlay.style.pointerEvents = "auto";
    this.setOverlayAlpha(0);

    this.phase = options.reducedMotion ? "reduced-in" : "build";
    if (this.origin && !options.reducedMotion) this.burst(this.origin.x, this.origin.y, 34, KIND_GOLD, 0.6);

    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
    return true;
  }

  /** Call when the new page has mounted. Starts the 500ms dissolve. */
  reveal() {
    if (this.phase === "waiting") this.enter("dissolve");
    else if (this.phase === "reduced-wait") this.enter("reduced-out");
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.phase = "idle";
  }

  // ---------------------------------------------------------------------------
  // Setup

  private onResize = () => {
    if (this.phase !== "idle") this.resize();
  };

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [c, ctx] of [
      [this.trail, this.tctx],
      [this.lights, this.lctx],
    ] as const) {
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    const mobile = w < 768;
    // Mobile: the tree fills the screen. Desktop: a centred tree, capped in size.
    const treeH = mobile ? h * 0.84 : Math.min(h * 0.84, 900);
    const baseY = (h + treeH) / 2;
    const maxR = mobile ? w * 0.42 : Math.min(treeH * 0.4, w * 0.38);
    this.g = { w, h, cx: w / 2, baseY, treeH, maxR, minDim: Math.min(w, h) };
  }

  private hideOverlay() {
    this.overlay.style.display = "none";
    this.overlay.style.pointerEvents = "none";
    this.setOverlayAlpha(0);
  }

  private setOverlayAlpha(a: number) {
    this.overlay.style.backgroundColor = `rgba(0,0,0,${a.toFixed(3)})`;
  }

  private enter(phase: Phase) {
    this.phase = phase;
    this.phaseStart = this.clock;
    if (phase === "dissolve") {
      // Give every light a gentle drift: down, and outward from the centre.
      const { cx, w } = this.g;
      for (let i = 0; i < this.ln; i++) {
        this.lvx[i] = ((this.lx[i] - cx) / w) * 140 + gauss() * 22;
        this.lvy[i] = rand(30, 90);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // The wand path: a 3D spiral cone projected to 2D, plus fast whipping noise.

  private pathAt(p: number): PathPoint {
    const { cx, baseY, treeH, maxR } = this.g;
    const s = this.seed;
    // Radius narrows toward the top, with a slow organic wobble.
    const taper = Math.pow(1 - p, 1.08);
    const r = maxR * taper * (0.9 + 0.1 * Math.sin(p * 9 + s.p1)) + 2;
    // Spiral angle. The extra sine makes the turning speed uneven, like a hand.
    const theta = s.turns * TAU * p + s.phase + 0.7 * Math.sin(p * 5 + s.p2);
    // High-frequency back-and-forth whip, scaled by the radius.
    const whip =
      r * 0.42 * Math.sin(p * 63 + s.p3) * Math.sin(p * 11 + s.p4) +
      r * 0.14 * Math.sin(p * 101 + s.p5);
    const z = Math.cos(theta);
    const x = cx + r * Math.sin(theta) + whip;
    // Camera slightly above: the front of each loop sits lower, giving depth.
    // The extra whip term on y tilts each stroke so loops are not flat rings.
    const y =
      baseY - p * treeH + r * 0.21 * z + whip * 0.22 + r * 0.07 * Math.sin(p * 47 + s.p6);
    return { x, y, z, r };
  }

  /** Wand progress over time: quick start, slight slow-down at the peak. */
  private progressAt(t: number) {
    return clamp01(t - Math.sin(TAU * t) / TAU * 0.45);
  }

  /** Cumulative share of lights emitted by progress p (denser at the wide bottom). */
  private emitShare(p: number) {
    return (p + 0.8 * (p - (p * p) / 2)) / 1.4;
  }

  // ---------------------------------------------------------------------------
  // Particles

  private addLight(x: number, y: number, z: number, r: number) {
    if (this.ln >= this.cap) return;
    const i = this.ln++;
    const spread = 4 + r * 0.11;
    this.lx[i] = x + gauss() * spread;
    this.ly[i] = y + gauss() * spread * 0.8;
    this.lvx[i] = gauss() * 70;
    this.lvy[i] = gauss() * 70;
    const depth = (z + 1) / 2; // 0 back .. 1 front
    this.lsize[i] = rand(1.1, 3.3) * (0.72 + 0.28 * depth);
    this.lalpha[i] = rand(0.5, 1) * (0.55 + 0.45 * depth);
    this.lfreq[i] = rand(0.004, 0.02);
    this.lphase[i] = rand(0, TAU);
    this.lbirth[i] = this.clock;
  }

  private addSpark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    kind: number,
    grav: number,
    drag: number,
  ) {
    if (this.sn >= MAX_SPARKS) return;
    const i = this.sn++;
    this.sx[i] = x;
    this.sy[i] = y;
    this.svx[i] = vx;
    this.svy[i] = vy;
    this.slife[i] = life;
    this.smax[i] = life;
    this.ssize[i] = size;
    this.skind[i] = kind;
    this.sgrav[i] = grav;
    this.sdrag[i] = drag;
  }

  private burst(x: number, y: number, count: number, kind: number, scale: number) {
    const speed = this.g.minDim * scale;
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = speed * rand(0.2, 1);
      this.addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.25, 0.55), rand(5, 10), kind, 0.4, 4);
    }
  }

  /** The red and green splash from the star. */
  private splash(x: number, y: number) {
    const S = this.g.minDim * 1.3;
    for (let i = 0; i < 360; i++) {
      const roll = Math.random();
      const kind = roll < 0.45 ? KIND_RED : roll < 0.9 ? KIND_GREEN : KIND_GOLD;
      const a = rand(0, TAU);
      const v = S * (0.25 + Math.pow(Math.random(), 0.6) * 0.85);
      this.addSpark(
        x,
        y,
        Math.cos(a) * v,
        Math.sin(a) * v - S * 0.38, // upward bias, then gravity pulls them down
        rand(1.1, 2),
        rand(6, 15),
        kind,
        1,
        rand(1.1, 1.8),
      );
    }
    // A quick white flash ring.
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * TAU;
      const v = S * rand(0.9, 1.3);
      this.addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.18, 0.32), rand(5, 9), KIND_WHITE, 0, 6);
    }
  }

  // ---------------------------------------------------------------------------
  // Frame loop

  private tick = (now: number) => {
    const dtMs = Math.min(now - this.last, 50);
    this.last = now;
    this.clock += dtMs;
    const dt = dtMs / 1000;

    switch (this.phase) {
      case "reduced-in": {
        const k = clamp01((this.clock - this.phaseStart) / TIMING.reducedIn);
        this.setOverlayAlpha(k);
        if (k >= 1) {
          this.enter("reduced-wait");
          this.opts.onNavigate();
        }
        break;
      }
      case "reduced-wait":
        this.setOverlayAlpha(1);
        if (this.clock - this.phaseStart > TIMING.routeTimeout) this.enter("reduced-out");
        break;
      case "reduced-out": {
        const k = clamp01((this.clock - this.phaseStart) / TIMING.reducedOut);
        this.setOverlayAlpha(1 - k);
        if (k >= 1) return this.finish();
        break;
      }
      default:
        if (this.frame(dt) === "done") return this.finish();
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private frame(dt: number): "done" | void {
    const { w, h } = this.g;
    const t = this.clock;
    const buildEnd = this.summonDur + TIMING.draw;

    // Overlay: transparent -> black while the tree builds, black -> clear while dissolving.
    let fade = 1; // multiplier for all particle alpha
    if (this.phase === "build") {
      this.setOverlayAlpha(easeInOutSine(clamp01(t / buildEnd)));
    } else if (this.phase === "waiting") {
      this.setOverlayAlpha(1);
      if (t - this.phaseStart > TIMING.routeTimeout) this.enter("dissolve");
    }
    if (this.phase === "dissolve") {
      const k = clamp01((t - this.phaseStart) / TIMING.dissolve);
      this.setOverlayAlpha(1 - easeInOutSine(k));
      fade = Math.pow(1 - k, 1.3);
      if (k >= 1) return "done";
    }

    // Trail canvas: alpha clear for the glowing motion blur. Using destination-out
    // fades old pixels toward transparent (not toward black), so the page can still
    // show through while the overlay is fading in.
    const tctx = this.tctx;
    tctx.globalCompositeOperation = "destination-out";
    tctx.globalAlpha = 1;
    tctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.85, dt * 60)})`;
    tctx.fillRect(0, 0, w, h);
    tctx.globalCompositeOperation = "lighter";

    if (this.phase === "build") {
      if (this.origin && t < this.summonDur) this.updateSummon(t);
      else if (t >= this.summonDur) this.updateWand(t);

      if (this.starTime < 0 && t >= buildEnd) {
        this.starTime = t;
        const peak = this.pathAt(1);
        this.splash(peak.x, peak.y);
      }
      if (this.starTime >= 0 && t - this.starTime >= TIMING.navDelay) {
        this.enter("waiting");
        this.opts.onNavigate();
      }
    }

    this.updateSparks(dt, fade);
    this.drawLights(dt, fade);
  }

  /** Comet from the tap point to the base of the tree. */
  private updateSummon(t: number) {
    const o = this.origin!;
    const { cx, baseY, h } = this.g;
    const u = easeOutCubic(clamp01(t / this.summonDur));
    const c1x = (o.x + cx) / 2;
    const c1y = Math.min(o.y, baseY) - h * 0.18;
    const bez = (a: number, b: number, c: number, k: number) => (1 - k) * (1 - k) * a + 2 * (1 - k) * k * b + k * k * c;
    const x = bez(o.x, c1x, cx, u);
    const y = bez(o.y, c1y, baseY, u);
    this.stampTo(x, y, 1);
    for (let i = 0; i < 4; i++) {
      this.addSpark(x, y, gauss() * 160, gauss() * 160 - 40, rand(0.3, 0.6), rand(4, 8), KIND_GOLD, 0.6, 3);
    }
  }

  /** Advance the wand, stamp its glowing head, and drop fixed white lights. */
  private updateWand(t: number) {
    const k = clamp01((t - this.summonDur) / TIMING.draw);
    const p = this.progressAt(k);
    const p0 = this.lastP;
    if (p <= p0 && k < 1) return;

    // Lights
    const share = (this.emitShare(p) - this.emitShare(p0)) * this.cap + this.carry;
    const n = Math.floor(share);
    this.carry = share - n;
    for (let i = 0; i < n; i++) {
      const pt = this.pathAt(p0 + (p - p0) * Math.random());
      this.addLight(pt.x, pt.y, pt.z, pt.r);
    }

    // Head: stamp along the curve (not a straight line) so fast loops stay round.
    const steps = Math.min(48, Math.max(2, Math.ceil(((p - p0) * this.g.treeH * this.seed.turns) / 3)));
    for (let j = 1; j <= steps; j++) {
      const pt = this.pathAt(p0 + ((p - p0) * j) / steps);
      this.stampTo(pt.x, pt.y, 0.75 + 0.25 * pt.z);
    }

    // A little spray falling off the wand tip.
    const head = this.pathAt(p);
    for (let i = 0; i < 2; i++) {
      this.addSpark(head.x, head.y, gauss() * 140, gauss() * 110 - 40, rand(0.25, 0.5), rand(3, 6), Math.random() < 0.7 ? KIND_WHITE : KIND_GOLD, 0.25, 3);
    }
    this.lastP = p;
  }

  private stampTo(x: number, y: number, bright: number) {
    const ctx = this.tctx;
    const prev = this.prevHead ?? { x, y };
    const dist = Math.hypot(x - prev.x, y - prev.y);
    const steps = Math.min(24, Math.max(1, Math.ceil(dist / 4)));
    ctx.globalAlpha = 0.8 * bright;
    for (let i = 1; i <= steps; i++) {
      const sx = prev.x + ((x - prev.x) * i) / steps;
      const sy = prev.y + ((y - prev.y) * i) / steps;
      ctx.drawImage(this.glowWarm, sx - 11, sy - 11, 22, 22);
    }
    this.prevHead = { x, y };
  }

  private updateSparks(dt: number, fade: number) {
    const ctx = this.tctx;
    const { h } = this.g;
    const gravity = h * 2.1; // px/s^2, scaled to the screen
    for (let i = 0; i < this.sn; i++) {
      this.slife[i] -= dt;
      if (this.slife[i] <= 0 || this.sy[i] > h + 30) {
        // swap-remove
        const last = --this.sn;
        this.sx[i] = this.sx[last];
        this.sy[i] = this.sy[last];
        this.svx[i] = this.svx[last];
        this.svy[i] = this.svy[last];
        this.slife[i] = this.slife[last];
        this.smax[i] = this.smax[last];
        this.ssize[i] = this.ssize[last];
        this.skind[i] = this.skind[last];
        this.sgrav[i] = this.sgrav[last];
        this.sdrag[i] = this.sdrag[last];
        i--;
        continue;
      }
      const drag = Math.exp(-this.sdrag[i] * dt);
      this.svx[i] *= drag;
      this.svy[i] = this.svy[i] * drag + gravity * this.sgrav[i] * dt;
      this.sx[i] += this.svx[i] * dt;
      this.sy[i] += this.svy[i] * dt;

      const kind = this.skind[i];
      let a = this.slife[i] / this.smax[i];
      if (kind === KIND_RED || kind === KIND_GREEN) {
        // Fade out as they fall toward the bottom, with a little flicker.
        a *= clamp01((h - this.sy[i]) / (h * 0.55)) * (0.75 + 0.25 * Math.sin(this.clock * 0.03 + i));
      }
      a *= fade;
      if (a <= 0.01) continue;
      const s = this.ssize[i];
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(this.sparkSprites[kind], this.sx[i] - s / 2, this.sy[i] - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private drawLights(dt: number, fade: number) {
    const ctx = this.lctx;
    const { w, h } = this.g;
    const t = this.clock;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    const dissolving = this.phase === "dissolve";
    const drag = Math.exp(-8 * dt);
    const sprite = this.glowWhite;
    for (let i = 0; i < this.ln; i++) {
      if (dissolving) {
        this.lvy[i] += 60 * dt;
      } else {
        this.lvx[i] *= drag;
        this.lvy[i] *= drag;
      }
      this.lx[i] += this.lvx[i] * dt;
      this.ly[i] += this.lvy[i] * dt;

      const age = t - this.lbirth[i];
      const flash = age < 160 ? 1 + 1.6 * (1 - age / 160) : 1;
      const tw = 0.5 + 0.5 * Math.sin(t * this.lfreq[i] + this.lphase[i]);
      const a = this.lalpha[i] * (0.25 + 0.75 * tw * tw) * flash * fade;
      if (a <= 0.01) continue;
      const s = this.lsize[i] * 3.2 * (flash > 1 ? 1 + (flash - 1) * 0.4 : 1);
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(sprite, this.lx[i] - s / 2, this.ly[i] - s / 2, s, s);
    }

    if (this.starTime >= 0) this.drawStar(t - this.starTime, fade);
    ctx.globalAlpha = 1;
  }

  private drawStar(age: number, fade: number) {
    const ctx = this.lctx;
    const peak = this.pathAt(1);
    const { minDim } = this.g;
    const R = minDim * 0.075;
    const pop = age < 140 ? easeOutBack(age / 140) * 1.7 : 1.7 - 0.55 * clamp01((age - 140) / 320);
    const scale = Math.max(0, pop + 0.05 * Math.sin(age * 0.02));

    // Big soft glow
    ctx.globalAlpha = 0.9 * fade;
    const gs = R * 4.2 * scale;
    ctx.drawImage(this.glowWarm, peak.x - gs / 2, peak.y - gs / 2, gs, gs);

    // Lens-flare rays
    const ray = R * 3.2 * scale;
    ctx.globalAlpha = 0.55 * fade;
    for (const [dx, dy, len] of [
      [1, 0, ray],
      [0, 1, ray * 0.8],
    ] as const) {
      const grd = ctx.createLinearGradient(peak.x - dx * len, peak.y - dy * len, peak.x + dx * len, peak.y + dy * len);
      grd.addColorStop(0, "rgba(255,230,170,0)");
      grd.addColorStop(0.5, "rgba(255,248,225,1)");
      grd.addColorStop(1, "rgba(255,230,170,0)");
      ctx.fillStyle = grd;
      if (dx) ctx.fillRect(peak.x - len, peak.y - 1, len * 2, 2);
      else ctx.fillRect(peak.x - 1, peak.y - len, 2, len * 2);
    }

    // Five-point star, slowly turning
    const outer = R * 0.62 * scale;
    const inner = outer * 0.42;
    const rot = -Math.PI / 2 + age * 0.0012;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? outer : inner;
      const a = rot + (i * Math.PI) / 5;
      const px = peak.x + Math.cos(a) * rr;
      const py = peak.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const sg = ctx.createRadialGradient(peak.x, peak.y, 0, peak.x, peak.y, outer);
    sg.addColorStop(0, "#ffffff");
    sg.addColorStop(0.5, "#fff1b8");
    sg.addColorStop(1, "#ffc94d");
    ctx.fillStyle = sg;
    ctx.fill();
  }

  private finish() {
    cancelAnimationFrame(this.raf);
    this.phase = "idle";
    this.ln = 0;
    this.sn = 0;
    this.tctx.globalCompositeOperation = "source-over";
    this.lctx.globalCompositeOperation = "source-over";
    this.tctx.clearRect(0, 0, this.g.w, this.g.h);
    this.lctx.clearRect(0, 0, this.g.w, this.g.h);
    this.hideOverlay();
    this.opts.onDone?.();
  }
}
