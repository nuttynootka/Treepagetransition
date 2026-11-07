// Physics for the hanging menu: glass plates on chains.
//
// Each plate is a rigid body made of 4 points (where its chains attach: two on
// the top edge, two on the bottom), held in shape by 6 stiff links. Each plate
// hangs from the plate above it (or from the garland) by two chains. A chain is
// a "rope" link: it pulls when stretched and goes slack when not.
//
// Points move by Verlet integration (the next position comes from the current
// and previous ones), then every link is nudged back to its length a few times
// per step (position-based dynamics). Plates coupled like this form a chain of
// pendulums, so each plate's motion depends on the others' and they never swing
// in unison.
//
// No React in here: the component hands over the DOM elements and calls
// open() / close() / poke().

type Pt = { x: number; y: number; px: number; py: number };

const TL = 0;
const TR = 1;
const BL = 2;
const BR = 3;

/** Gentle, heavy-feeling settings. Units: px and seconds. */
const PHYS = {
  gravity: 2200,
  /** Air drag, per second. */
  drag: 0.9,
  substep: 1 / 180,
  iterations: 8,
  /** Chains stretch very slightly, which softens the catch when a plate drops. */
  chainStiffness: 0.66,
  /** Faint breeze, as a sideways acceleration (px/s²). */
  breeze: 55,
  /** Twist around the vertical axis: natural period ≈ 2.4s, lightly damped. */
  twistStiffness: (2 * Math.PI / 2.4) ** 2,
  twistDamping: 2 * 0.14 * (2 * Math.PI / 2.4),
  twistFromSwing: 0.0045,
  maxTwist: 0.21, // ≈ 12°
  /** Unfurl: each plate swings down from folded flat against the bottom of the plate
   *  above, on a hinge with a little flutter. */
  foldStiffness: (2 * Math.PI / 0.62) ** 2,
  foldDamping: 2 * 0.4 * (2 * Math.PI / 0.62),
  /** Opening: the garland chains lower the first plate over this long, easing in and out.
   *  Mid-way they run a little faster than the plate falls, so it gets a soft, bouncy catch. */
  leadTime: 0.5,
  /** Chains between plates lengthen over this long once a plate is let go. */
  gapTime: 0.2,
  /** A plate is let go this long after the one above, once that one is mostly unfolded. */
  releaseGap: 0.11,
  releaseFold: -45,
  /** Closing: seconds between reeling plates in, and how long each takes. */
  reelGap: 0.09,
  reelTime: 0.34,
  /** Chain length between plates. */
  gap: 15,
  /** Where chains attach, as a share of plate width from each side: corners for the garland chains,
   *  closer to the middle between plates, so each plate can pivot on its own. */
  leadAttach: 0.2,
  innerAttach: 0.34,
  /** Small random sideways push and twist each plate gets as it drops, so no two drops look alike. */
  dropKick: 55,
  /** Faint random twisting from the breeze (rad/s²). */
  breezeTwist: 0.5,
};

/** Keep in step with the hidden-delay in garland-header.css. */
export const closeDuration = (n: number) => (n - 1) * PHYS.reelGap + PHYS.reelTime;

interface Plate {
  p: Pt[];
  /** Attach points in the plate's own frame (origin at the top centre, y down). */
  local: { x: number; y: number }[];
  mode: "held" | "free" | "reel";
  modeAt: number;
  from: { x: number; y: number }[];
  fold: number;
  foldV: number;
  /** Fold and twist one physics step ago, for smooth drawing between steps. */
  prevFold: number;
  prevTwist: number;
  foldFrom: number;
  twist: number;
  twistV: number;
  /** Breeze phases and speeds, different for every plate. */
  wind: number[];
}

export interface ChainLadderOptions {
  plates: HTMLElement[];
  /** Left and right chain element for each plate (the chains above it). */
  chains: [HTMLElement, HTMLElement][];
  reducedMotion: boolean;
}

export class ChainLadder {
  private plates: Plate[];
  private els: HTMLElement[];
  private chains: [HTMLElement, HTMLElement][];
  private reduced: boolean;
  /** Each plate's own width (plates hug their labels). x = 0 is the menu's centre line. */
  private widths: number[] = [];
  /** Half the distance between the two garland chains. */
  private anchorHalf = 40;
  private H = 44;
  private lead = 160;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private openAt = 0;
  private opens = 0;
  private closeAt = 0;
  private state: "closed" | "opening" | "open" | "closing" = "closed";

  constructor(opts: ChainLadderOptions) {
    this.els = opts.plates;
    this.chains = opts.chains;
    this.reduced = opts.reducedMotion;
    this.plates = this.els.map((_, i) => ({
      p: [0, 1, 2, 3].map(() => ({ x: 0, y: 0, px: 0, py: 0 })),
      local: [],
      mode: "held",
      modeAt: 0,
      from: [],
      fold: -90,
      foldV: 0,
      prevFold: -90,
      prevTwist: 0,
      foldFrom: -90,
      twist: 0,
      twistV: 0,
      wind: [0, 1, 2, 3, 4, 5].map((k) => {
        // Seeded per plate and per term, so plates drift independently.
        const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
        return s - Math.floor(s);
      }),
    }));
    // Default sizes until the component measures the real ones.
    this.setGeometry(this.els.map(() => 160), this.H, this.lead);
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }

  /** Each plate's width, the plates' height, and the long lead chain from the garland to the first plate. */
  setGeometry(widths: number[], H: number, lead: number) {
    this.widths = widths;
    this.H = H;
    this.lead = Math.max(20, lead);
    this.anchorHalf = (0.5 - PHYS.leadAttach) * widths[0];
    this.plates.forEach((pl, i) => {
      const W = widths[i] ?? widths[0];
      const top = i === 0 ? this.anchorHalf : (0.5 - PHYS.innerAttach) * W;
      const bottom = (0.5 - PHYS.innerAttach) * W;
      pl.local = [
        { x: -top, y: 0 },
        { x: top, y: 0 },
        { x: -bottom, y: H },
        { x: bottom, y: H },
      ];
    });
    if (this.state === "closed") this.holdAll();
    if (this.reduced && this.state !== "closed") this.hangStill();
    this.render();
  }

  open() {
    if (this.state === "open" || this.state === "opening") return;
    if (this.reduced) {
      this.state = "open";
      this.hangStill();
      this.render();
      return;
    }
    if (this.state === "closed") this.holdAll();
    this.state = "opening";
    this.openAt = this.time;
    this.opens++;
    // Plates still on their way up drop again from wherever they are.
    this.plates.forEach((pl) => {
      if (pl.mode === "reel") this.setMode(pl, "held");
    });
    this.start();
  }

  close() {
    if (this.state === "closed" || this.state === "closing") return;
    if (this.reduced) {
      this.state = "closed";
      this.holdAll();
      return; // CSS fades it out
    }
    this.state = "closing";
    this.closeAt = this.time;
    this.start();
  }

  /**
   * A push from the pointer at (x, y) in ladder coordinates, with velocity
   * (vx, vy) in px/s. Points near the contact get most of it, so an off-centre
   * push also tilts and twists the plate.
   */
  poke(i: number, x: number, y: number, vx: number, vy: number) {
    const pl = this.plates[i];
    if (!pl || pl.mode !== "free" || this.reduced) return;
    const h = PHYS.substep;
    const reach = Math.hypot(this.widths[i] ?? 160, this.H);
    const c = this.centre(pl);
    for (const pt of pl.p) {
      const w = Math.max(0.25, 1 - Math.hypot(pt.x - x, pt.y - y) / reach);
      pt.px -= vx * w * h;
      pt.py -= vy * w * h;
    }
    pl.twistV += (vx / 500) * (x < c.x ? 1 : -1) * 0.8;
    this.start();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // -------------------------------------------------------------------------

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(1 / 30, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= PHYS.substep) {
      this.step(PHYS.substep);
      this.acc -= PHYS.substep;
    }
    // Draw between the last two physics steps, so motion stays even at any screen refresh rate.
    this.render(this.acc / PHYS.substep);
    if (this.state === "closed") {
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private setMode(pl: Plate, mode: Plate["mode"]) {
    pl.mode = mode;
    pl.modeAt = this.time;
    if (mode === "reel") {
      pl.from = pl.p.map((q) => ({ x: q.x, y: q.y }));
      pl.foldFrom = pl.fold;
    }
  }

  /** A plate's position and angle, from its two top attach points. */
  private poseOf(pl: Plate) {
    const a = pl.p[TL];
    const b = pl.p[TR];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  /**
   * Where plate i sits when rolled up: folded against the bottom edge of the plate above
   * (its top on that plate's bottom chain points), or for the first plate, at the garland.
   * `prev` gives the position one step ago, so a plate let go keeps its holder's motion.
   */
  private holdTarget(i: number, prev = false): { x: number; y: number }[] {
    let f = { x: 0, y: 0, angle: 0 };
    if (i > 0) {
      const par = this.plates[i - 1].p;
      const a = prev ? { x: par[BL].px, y: par[BL].py } : par[BL];
      const b = prev ? { x: par[BR].px, y: par[BR].py } : par[BR];
      f = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    const c = Math.cos(f.angle);
    const s = Math.sin(f.angle);
    return this.plates[i].local.map((q) => ({ x: f.x + q.x * c - q.y * s, y: f.y + q.x * s + q.y * c }));
  }

  private holdAll() {
    this.plates.forEach((pl, i) => {
      pl.mode = "held";
      const t = this.holdTarget(i);
      pl.p.forEach((q, k) => {
        q.x = q.px = t[k].x;
        q.y = q.py = t[k].y;
      });
      pl.fold = pl.prevFold = -90;
      pl.foldV = 0;
      pl.twist = pl.twistV = pl.prevTwist = 0;
    });
  }

  /** Reduced motion: hang straight down, no animation. */
  private hangStill() {
    let top = this.lead;
    this.plates.forEach((pl) => {
      pl.mode = "free";
      pl.p.forEach((q, k) => {
        q.x = q.px = pl.local[k].x;
        q.y = q.py = top + pl.local[k].y;
      });
      pl.fold = 0;
      pl.twist = 0;
      top += this.H + PHYS.gap;
    });
  }

  private centre(pl: Plate) {
    return {
      x: (pl.p[0].x + pl.p[1].x + pl.p[2].x + pl.p[3].x) / 4,
      y: (pl.p[0].y + pl.p[1].y + pl.p[2].y + pl.p[3].y) / 4,
    };
  }

  private step(h: number) {
    this.time += h;
    const t = this.time;
    const n = this.plates.length;

    // Schedule: release plates top to bottom when opening, reel them in bottom to top when closing.
    if (this.state === "opening") {
      this.plates.forEach((pl, i) => {
        const parent = i > 0 ? this.plates[i - 1] : null;
        const ready = parent
          ? parent.mode === "free" && t - parent.modeAt >= PHYS.releaseGap && parent.fold > PHYS.releaseFold
          : t >= this.openAt;
        if (pl.mode === "held" && ready) {
          // Let go, carrying the velocity of whatever was holding it, plus a small random nudge.
          this.setMode(pl, "free");
          const r1 = hash(i * 7.1 + this.opens * 3.7);
          const r2 = hash(i * 2.3 + this.opens * 9.1);
          const push = (r1 - 0.5) * 2 * PHYS.dropKick * PHYS.substep;
          pl.p[BL].px -= push * 1.3;
          pl.p[BR].px -= push * 1.3;
          pl.p[TL].px -= push * 0.6;
          pl.p[TR].px -= push * 0.6;
          pl.twistV += (r2 - 0.5) * 1.2;
        }
      });
      if (this.plates.every((pl) => pl.mode === "free")) this.state = "open";
    } else if (this.state === "closing") {
      this.plates.forEach((pl, i) => {
        const at = this.closeAt + (n - 1 - i) * PHYS.reelGap;
        if (pl.mode === "free" && t >= at) this.setMode(pl, "reel");
        if (pl.mode === "reel" && t - pl.modeAt >= PHYS.reelTime) pl.mode = "held";
      });
      if (this.plates.every((pl) => pl.mode === "held")) {
        this.state = "closed";
        this.holdAll();
        return;
      }
    }

    for (const pl of this.plates) {
      pl.prevFold = pl.fold;
      pl.prevTwist = pl.twist;
    }

    const drag = Math.max(0, 1 - PHYS.drag * h);
    const g = PHYS.gravity * h * h;

    // 1. Move free points (Verlet), with gravity and a faint breeze.
    for (const pl of this.plates) {
      if (pl.mode !== "free") continue;
      const w = pl.wind;
      const gust =
        PHYS.breeze *
        (Math.sin(t * (0.23 + w[0] * 0.2) + w[1] * 6.28) +
          0.6 * Math.sin(t * (0.61 + w[2] * 0.3) + w[3] * 6.28) +
          0.3 * Math.sin(t * (1.7 + w[4] * 0.6) + w[5] * 6.28));
      for (let k = 0; k < 4; k++) {
        const q = pl.p[k];
        const lever = k >= BL ? 1.35 : 0.65;
        const vx = (q.x - q.px) * drag;
        const vy = (q.y - q.py) * drag;
        q.px = q.x;
        q.py = q.y;
        q.x += vx + gust * lever * h * h;
        q.y += vy + g;
      }
    }

    // 2. Satisfy chains and plate shapes.
    const aL = { x: -this.anchorHalf, y: 0 };
    const aR = { x: this.anchorHalf, y: 0 };
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    for (let it = 0; it < PHYS.iterations; it++) {
      for (let i = 0; i < n; i++) {
        const pl = this.plates[i];
        if (pl.mode !== "free") continue;
        const parent = i > 0 ? this.plates[i - 1] : null;
        const parentMoves = parent?.mode === "free";
        // Chains pay out smoothly after a plate is let go, instead of all at once.
        const since = t - pl.modeAt;
        const len = i === 0 ? this.lead * ease(since / PHYS.leadTime) : PHYS.gap * ease(since / PHYS.gapTime);
        const upL = parent ? parent.p[BL] : aL;
        const upR = parent ? parent.p[BR] : aR;
        rope(upL, pl.p[TL], len, parentMoves ? 1 : 0, 1);
        rope(upR, pl.p[TR], len, parentMoves ? 1 : 0, 1);
        const L = pl.local;
        rigid(pl.p[TL], pl.p[TR], dist(L[TL], L[TR]));
        rigid(pl.p[BL], pl.p[BR], dist(L[BL], L[BR]));
        rigid(pl.p[TL], pl.p[BL], dist(L[TL], L[BL]));
        rigid(pl.p[TR], pl.p[BR], dist(L[TR], L[BR]));
        rigid(pl.p[TL], pl.p[BR], dist(L[TL], L[BR]));
        rigid(pl.p[TR], pl.p[BL], dist(L[TR], L[BL]));
      }
    }

    // 3. Plates that aren't free follow their holder (held) or are pulled up into it (reel).
    for (let i = 0; i < n; i++) {
      const pl = this.plates[i];
      if (pl.mode === "free") continue;
      const target = this.holdTarget(i);
      if (pl.mode === "held") {
        const before = i > 0 ? this.holdTarget(i, true) : target;
        pl.p.forEach((q, k) => {
          q.x = target[k].x;
          q.y = target[k].y;
          q.px = before[k].x;
          q.py = before[k].y;
        });
      } else {
        const k = Math.min(1, (t - pl.modeAt) / PHYS.reelTime);
        const e = k * k * (3 - 2 * k);
        pl.p.forEach((q, j) => {
          q.px = q.x;
          q.py = q.y;
          q.x = pl.from[j].x + (target[j].x - pl.from[j].x) * e;
          q.y = pl.from[j].y + (target[j].y - pl.from[j].y) * e;
        });
      }
    }

    // 4. Unfurl (fold) and twist.
    for (let i = 0; i < n; i++) {
      const pl = this.plates[i];
      if (pl.mode === "free") {
        const fa = -PHYS.foldStiffness * pl.fold - PHYS.foldDamping * pl.foldV;
        pl.foldV += fa * h;
        pl.fold += pl.foldV * h;

        // Twist is driven by how fast this plate moves sideways compared with the one above it.
        const parent = i > 0 ? this.plates[i - 1] : null;
        const vx = (pl.p[TL].x - pl.p[TL].px + pl.p[TR].x - pl.p[TR].px) / (2 * h);
        const pvx = parent && parent.mode === "free" ? (parent.p[BL].x - parent.p[BL].px + parent.p[BR].x - parent.p[BR].px) / (2 * h) : 0;
        const w = pl.wind;
        const twistGust = PHYS.breezeTwist * (Math.sin(t * (0.31 + w[1] * 0.25) + w[4] * 6.28) + 0.5 * Math.sin(t * (0.9 + w[3] * 0.4) + w[0] * 6.28));
        const ta =
          -PHYS.twistStiffness * pl.twist - PHYS.twistDamping * pl.twistV + PHYS.twistFromSwing * (vx - pvx) + twistGust;
        pl.twistV += ta * h;
        pl.twist = Math.max(-PHYS.maxTwist, Math.min(PHYS.maxTwist, pl.twist + pl.twistV * h));
      } else if (pl.mode === "reel") {
        const k = Math.min(1, (t - pl.modeAt) / PHYS.reelTime);
        pl.fold = pl.foldFrom + (-90 - pl.foldFrom) * k * k;
        pl.twist *= 0.9;
        pl.twistV = 0;
      } else {
        pl.fold = -90;
        pl.foldV = 0;
        pl.twist = pl.twistV = 0;
      }
    }
  }

  private render(alpha = 1) {
    const n = this.plates.length;
    const at = (q: Pt) => ({ x: q.px + (q.x - q.px) * alpha, y: q.py + (q.y - q.py) * alpha });
    for (let i = 0; i < n; i++) {
      const pl = this.plates[i];
      const el = this.els[i];
      const fold = pl.prevFold + (pl.fold - pl.prevFold) * alpha;
      const twist = pl.prevTwist + (pl.twist - pl.prevTwist) * alpha;
      const [a, b] = [at(pl.p[TL]), at(pl.p[TR])];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const hidden = pl.mode === "held" || fold < -86;
      el.style.transform =
        `translate3d(${(mx - (this.widths[i] ?? 0) / 2).toFixed(2)}px, ${my.toFixed(2)}px, 0) perspective(700px) ` +
        `rotate(${angle.toFixed(4)}rad) rotateY(${twist.toFixed(4)}rad) rotateX(${fold.toFixed(2)}deg)`;
      el.style.opacity = hidden ? "0" : "1";
      // Lets the plate's reflection slide across the glass as it twists.
      el.style.setProperty("--tw", twist.toFixed(3));

      // Chains from the holder down to this plate's top corners.
      const parent = i > 0 ? this.plates[i - 1] : null;
      const ups = parent
        ? [at(parent.p[BL]), at(parent.p[BR])]
        : [{ x: -this.anchorHalf, y: 0 }, { x: this.anchorHalf, y: 0 }];
      const downs = [a, b];
      for (let s = 0; s < 2; s++) {
        const c = this.chains[i][s];
        const dx = downs[s].x - ups[s].x;
        const dy = downs[s].y - ups[s].y;
        const len = Math.hypot(dx, dy);
        if (pl.mode === "held" || len < 1) {
          c.style.opacity = "0";
          continue;
        }
        c.style.opacity = "1";
        c.style.height = `${len.toFixed(1)}px`;
        c.style.transform = `translate(${(ups[s].x - 4).toFixed(2)}px, ${ups[s].y.toFixed(2)}px) rotate(${Math.atan2(-dx, dy).toFixed(4)}rad)`;
      }
    }
  }
}

/** Smooth start and stop, 0..1 (smootherstep). */
function ease(k: number) {
  const x = Math.max(0, Math.min(1, k));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Repeatable pseudo-random number in [0, 1). */
function hash(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** Rope: only pulls when longer than `len`. wa/wb: how freely each end moves (0 = fixed). */
function rope(a: { x: number; y: number }, b: Pt, len: number, wa: number, wb: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d <= len || d === 0) return;
  const k = ((d - len) / d / (wa + wb)) * PHYS.chainStiffness;
  if (wa) {
    (a as Pt).x += dx * k * wa;
    (a as Pt).y += dy * k * wa;
  }
  b.x -= dx * k * wb;
  b.y -= dy * k * wb;
}

/** Stiff link that keeps a plate's shape. */
function rigid(a: Pt, b: Pt, len: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 0.0001;
  const k = (d - len) / d / 2;
  a.x += dx * k;
  a.y += dy * k;
  b.x -= dx * k;
  b.y -= dy * k;
}
