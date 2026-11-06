"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotionConfig,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { InteriorView } from "./InteriorView";
import { Snowfall } from "./Snowfall";
import type { DoorEffects, DoorPhase, DoorSelection, InteriorImage, WreathProduct } from "./types";

/** Timing of the door sequence, in seconds (angle in degrees). */
export const DOOR_TIMING = {
  openAngle: 72,
  open: 0.9,
  hold: 0.42,
  close: 0.34,
  /** How long after the slam the wreath counts as settled (springs keep easing out after). */
  settle: 1.3,
};

/*
 * Spring settings. The wreath is treated as a pendulum hanging from the hook:
 * stiffness 60 with mass 1 gives about 1.2 swings per second, which matches a
 * 60cm wreath. Damping sets how fast it calms down.
 */
const SPRINGS = {
  /** Side-to-side sway in the plane of the door. */
  sway: { stiffness: 60, damping: 1.9, mass: 1 },
  /** Bottom of the wreath swinging out from the door and knocking back against it. */
  tilt: { stiffness: 60, damping: 3.2, mass: 1 },
  /** Vertical jolt on the hook. */
  bounce: { stiffness: 380, damping: 10, mass: 1 },
  /** The door bouncing slightly off its stop when it slams. */
  doorStop: { stiffness: 900, damping: 32, mass: 1 },
};

/* Layout of the scene, in % of the stage (stage is 4:5). Door is 1:2.2. */
const DOOR_RECT = { left: 27, top: 9, width: 46, height: 81 };
const HOOK_Y = 7; // % of door height
const WREATH_W = 64; // % of door width
const WREATH_H = WREATH_W / 2.2; // % of door height (the door is 2.2x taller than wide, the wreath is square)

export interface DoorSceneProps {
  /** The product to hang. Change `nonce` to replay for the same product. */
  selection: DoorSelection | null;
  /** Photo of the room behind the door. Without it a simple blurred stand-in is shown. */
  interior?: InteriorImage;
  effects?: DoorEffects;
  /** Called each time the sequence moves to a new phase. */
  onPhaseChange?: (phase: DoorPhase, product: WreathProduct | null) => void;
  className?: string;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function preload(src: string): Promise<void> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img.decode().catch(() => undefined);
}

export function DoorScene({ selection, interior, effects, onPhaseChange, className = "" }: DoorSceneProps) {
  const fx = { firelight: true, wreathShadow: true, snow: true, porchLight: true, ...effects };
  const reducedMotion = useReducedMotionConfig() ?? false;

  const [hung, setHung] = useState<WreathProduct | null>(null);
  const [phase, setPhaseState] = useState<DoorPhase>("idle");
  const phaseRef = useRef<DoorPhase>("idle");
  const hungRef = useRef<WreathProduct | null>(null);
  const pendingRef = useRef<WreathProduct | null>(null);
  const runRef = useRef(0);
  const onPhaseRef = useRef(onPhaseChange);
  onPhaseRef.current = onPhaseChange;

  // Every moving part is a motion value, so animation never re-renders React.
  const doorAngle = useMotionValue(0);
  const sway = useMotionValue(0);
  const tiltRaw = useMotionValue(0);
  const drop = useMotionValue(0);
  const wreathOpacity = useMotionValue(1);
  const porch = useMotionValue(0.12);

  const setPhase = useCallback((p: DoorPhase) => {
    phaseRef.current = p;
    setPhaseState(p);
    onPhaseRef.current?.(p, hungRef.current);
  }, []);

  const hang = useCallback((p: WreathProduct | null) => {
    hungRef.current = p;
    setHung(p);
  }, []);

  /** The jolt the wreath gets when the door stops dead. */
  const impact = useCallback(
    (strength: number) => {
      const dir = Math.random() < 0.5 ? -1 : 1;
      animate(sway, 0, { type: "spring", ...SPRINGS.sway, velocity: dir * (30 + Math.random() * 14) * strength });
      animate(tiltRaw, 0, { type: "spring", ...SPRINGS.tilt, velocity: 115 * strength });
      animate(drop, 0, { type: "spring", ...SPRINGS.bounce, velocity: -170 * strength });
    },
    [sway, tiltRaw, drop],
  );

  const resetWreath = useCallback(() => {
    for (const mv of [sway, tiltRaw, drop]) {
      mv.stop();
      mv.set(0);
    }
  }, [sway, tiltRaw, drop]);

  const warmPorchLight = useCallback(() => {
    animate(porch, [porch.get(), 0.75, 0.5, 1], { duration: 1.1, times: [0, 0.25, 0.4, 1], ease: "easeOut" });
  }, [porch]);

  const runCycle = useCallback(async () => {
    const id = ++runRef.current;
    const alive = () => id === runRef.current;
    const next = pendingRef.current;
    if (!next) return;
    const ready = preload(next.image.src);

    if (reducedMotion) {
      setPhase("holding");
      await animate(wreathOpacity, 0, { duration: 0.18 });
      await Promise.race([ready, wait(1200)]);
      if (!alive()) return;
      hang(pendingRef.current);
      resetWreath();
      await animate(wreathOpacity, 1, { duration: 0.3 });
      if (!alive()) return;
      porch.set(1);
      setPhase("settled");
      return;
    }

    // 1. Open: the door swings inward on its hinge. The wreath, resting on
    //    the door, lags behind for a moment and lifts off it slightly.
    setPhase("opening");
    animate(porch, 0.6, { duration: 0.6 });
    if (doorAngle.get() < 5) animate(tiltRaw, 0, { type: "spring", ...SPRINGS.tilt, velocity: 40 });
    const remaining = 1 - doorAngle.get() / DOOR_TIMING.openAngle;
    await animate(doorAngle, DOOR_TIMING.openAngle, {
      duration: Math.max(0.35, DOOR_TIMING.open * remaining),
      ease: [0.3, 0, 0.18, 1],
    });
    if (!alive()) return;

    // 2. Hold: while the door face is turned away, swap the wreath.
    setPhase("holding");
    const holdStart = performance.now();
    if (hungRef.current?.id !== pendingRef.current?.id) {
      await animate(wreathOpacity, 0, { duration: 0.12 });
      await Promise.race([ready, preload(pendingRef.current!.image.src), wait(1200)]);
      if (!alive()) return;
      hang(pendingRef.current);
      resetWreath();
      animate(wreathOpacity, 1, { duration: 0.2 });
    }
    const left = DOOR_TIMING.hold * 1000 - (performance.now() - holdStart);
    if (left > 0) await wait(left);
    if (!alive()) return;

    // 3. Close quickly: ease-in, so the door is at full speed when it hits the frame.
    setPhase("closing");
    await animate(doorAngle, 0, { duration: DOOR_TIMING.close, ease: [0.55, 0, 0.92, 0.5] });
    if (!alive()) return;

    // 4. Slam: the door bounces off its stop and the wreath swings and knocks.
    setPhase("settling");
    animate(doorAngle, 0, { type: "spring", ...SPRINGS.doorStop, velocity: 140 });
    impact(1);
    await wait(DOOR_TIMING.settle * 700);
    if (!alive()) return;
    warmPorchLight();
    await wait(DOOR_TIMING.settle * 300);
    if (!alive()) return;
    setPhase("settled");
  }, [reducedMotion, doorAngle, tiltRaw, wreathOpacity, porch, setPhase, hang, resetWreath, impact, warmPorchLight]);

  // React to a new selection.
  useEffect(() => {
    if (!selection) return;
    const p = phaseRef.current;
    // Same wreath already hanging and the door is shut: give it a little nudge.
    if (selection.product.id === hungRef.current?.id && (p === "settled" || p === "settling" || p === "idle")) {
      if (!reducedMotion) impact(0.45);
      return;
    }
    pendingRef.current = selection.product;
    // Door already on its way open: the newest pick is swapped in at the top.
    if (p === "opening" || p === "holding") return;
    void runCycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.nonce]);

  // Stop everything on unmount.
  useEffect(() => {
    return () => {
      runRef.current++;
      phaseRef.current = "idle";
      for (const mv of [doorAngle, sway, tiltRaw, drop, wreathOpacity, porch]) mv.stop();
    };
  }, [doorAngle, sway, tiltRaw, drop, wreathOpacity, porch]);

  // Derived values.
  const tilt = useTransform(tiltRaw, (v) => Math.abs(v)); // the door is a wall: the wreath reflects off it
  const doorShade = useTransform(doorAngle, [0, DOOR_TIMING.openAngle], [0, 0.6]);
  const sheenX = useTransform(doorAngle, [0, DOOR_TIMING.openAngle], ["0%", "-55%"]);
  const spill = useTransform(doorAngle, [0, 6, DOOR_TIMING.openAngle], [0, 0.55, 1]);
  const pageSpill = useTransform(spill, (v) => v * 0.7);
  const porchGlow = useTransform(porch, [0, 1], [0.05, 1]);

  const doorOpen = phase === "opening" || phase === "holding" || phase === "closing";
  const ariaLabel = hung
    ? `Front door preview with the ${hung.title} wreath hanging on it`
    : "Front door preview. Choose a wreath to hang it on the door.";

  return (
    <div className={`relative ${className}`}>
      {fx.firelight && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[16%] z-0"
          style={{
            opacity: pageSpill,
            background: "radial-gradient(50% 50% at 50% 55%, rgba(255,166,77,0.38), rgba(255,140,50,0.12) 55%, transparent 75%)",
          }}
        />
      )}

      <div
        role="img"
        aria-label={ariaLabel}
        className="relative z-[1] aspect-[4/5] w-full overflow-hidden rounded-[inherit] [container-type:inline-size]"
        style={{ background: "#141516" }}
      >
        <Facade porchGlow={porchGlow} showPorch={fx.porchLight} />

        {/* Doorway: the room behind, then warm glow around the frame. */}
        <div className="absolute" style={rectStyle(DOOR_RECT)}>
          <InteriorView interior={interior} active={doorOpen} reducedMotion={reducedMotion} />
        </div>

        {fx.firelight && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 mix-blend-screen"
              style={{
                opacity: spill,
                background: "radial-gradient(34% 44% at 50% 50%, rgba(255,160,70,0.42), rgba(255,140,60,0.12) 60%, transparent 80%)",
              }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 top-[90%] mix-blend-screen"
              style={{
                opacity: spill,
                clipPath: "polygon(40% 0, 73% 0, 100% 100%, 18% 100%)",
                background: "linear-gradient(180deg, rgba(255,170,85,0.65), rgba(255,140,60,0.05))",
              }}
            />
          </>
        )}

        {/* The door. Perspective is set on the whole stage so the vanishing point is its centre. */}
        <div className="absolute inset-0" style={{ perspective: "230cqw", perspectiveOrigin: "50% 45%" }}>
          <motion.div
            className="absolute will-change-transform"
            style={{
              ...rectStyle(DOOR_RECT),
              rotateY: doorAngle,
              transformOrigin: "0% 50%",
              transformStyle: "preserve-3d",
            }}
          >
            <DoorFace sheenX={sheenX} shade={doorShade} />
            <Hanger />
            {hung && (
              <HangingWreath
                product={hung}
                sway={sway}
                tilt={tilt}
                drop={drop}
                opacity={wreathOpacity}
                shadow={fx.wreathShadow}
              />
            )}
          </motion.div>
        </div>

        {fx.snow && !reducedMotion && (
          <div className="absolute inset-0">
            <Snowfall />
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "settled" && hung ? `${hung.title} is now hanging on the door.` : ""}
      </p>
    </div>
  );
}

function rectStyle(r: { left: number; top: number; width: number; height: number }): CSSProperties {
  return { left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` };
}

/* ---------------------------------------------------------------- Facade */

function Facade({ porchGlow, showPorch }: { porchGlow: MotionValue<number>; showPorch: boolean }) {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {/* Large-format limestone panels at night. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "repeating-linear-gradient(180deg, transparent 0 calc(18% - 1px), rgba(0,0,0,0.32) calc(18% - 1px) 18%)",
            "linear-gradient(90deg, transparent calc(12% - 1px), rgba(0,0,0,0.25) calc(12% - 1px) 12%, transparent 12% calc(88% - 1px), rgba(0,0,0,0.25) calc(88% - 1px) 88%, transparent 88%)",
            "linear-gradient(180deg, #2b2926 0%, #3c3833 40%, #36322d 100%)",
          ].join(","),
        }}
      />
      {/* Porch light: warm wash up and down the wall from the sconce. */}
      {showPorch && (
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: porchGlow,
            background: [
              "radial-gradient(9% 26% at 82.6% 22%, rgba(255,196,120,0.55), transparent 70%)",
              "radial-gradient(10% 30% at 82.6% 50%, rgba(255,196,120,0.45), transparent 72%)",
              "radial-gradient(30% 40% at 82.6% 35%, rgba(255,180,100,0.16), transparent 75%)",
            ].join(","),
          }}
        />
      )}
      {/* Eave shadow and vignette. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[8%] bg-gradient-to-b from-black/60 to-transparent" />

      {/* Door casing (frame). */}
      <div
        className="absolute rounded-t-[2px]"
        style={{
          left: "24.5%",
          top: "6.5%",
          width: "51%",
          height: "83.5%",
          background: "linear-gradient(90deg, #26282b, #303236 50%, #26282b)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.5), 0 10px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 3px rgba(0,0,0,0.25)",
        }}
      />

      {/* Stone step. */}
      <div
        className="absolute inset-x-0 bottom-0 top-[90%]"
        style={{
          background: "linear-gradient(180deg, #34312d 0%, #23211f 60%, #1a1918 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 6px 10px rgba(0,0,0,0.35)",
        }}
      />
      <div className="absolute top-[89.6%] h-[0.8%] bg-[#4a4b4e]" style={{ left: "26%", width: "48%" }} />

      {/* Modern up/down sconce, matte black. */}
      {showPorch && (
        <div className="absolute left-[81.4%] top-[30%] h-[10%] w-[2.4%]">
          <div className="absolute inset-0 rounded-[3px] bg-[linear-gradient(90deg,#0d0d0e,#1c1c1e_45%,#0b0b0c)] shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <motion.div
            className="absolute -inset-x-[30%] -top-[2%] h-[3%] rounded-full bg-[#ffd9a3] blur-[1px]"
            style={{ opacity: porchGlow }}
          />
          <motion.div
            className="absolute -inset-x-[30%] -bottom-[2%] h-[3%] rounded-full bg-[#ffd9a3] blur-[1px]"
            style={{ opacity: porchGlow }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Door */

// Fine vertical brushing for the metallic finish.
const BRUSHED =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9 0.008' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const PANEL_SHADOW = [
  "inset 0 0 0 1px rgba(0,0,0,0.55)",
  "inset 4px 5px 0 -1px rgba(0,0,0,0.35)",
  "inset -2px -2px 0 rgba(255,255,255,0.045)",
  "inset 8px 12px 18px rgba(0,0,0,0.55)",
  "0 1px 0 rgba(255,255,255,0.05)",
  "0 -1px 0 rgba(0,0,0,0.4)",
].join(",");

function DoorFace({ sheenX, shade }: { sheenX: MotionValue<string>; shade: MotionValue<number> }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 rounded-[1px]"
      style={{
        backgroundColor: "#1F2124",
        backgroundImage: "linear-gradient(100deg, rgba(255,255,255,0.05) 0%, transparent 30%, transparent 62%, rgba(255,255,255,0.035) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.045), inset 0 2px 0 rgba(255,255,255,0.06), inset 2px 0 0 rgba(255,255,255,0.03), inset -3px 0 6px rgba(0,0,0,0.45), inset 0 -14px 22px rgba(0,0,0,0.35)",
      }}
    >
      {/* brushed metal grain */}
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: BRUSHED, backgroundSize: "300px 300px" }} />

      {/* recessed panels with deep bevels */}
      <div className="absolute left-[14%] right-[14%] top-[12%] h-[30%] rounded-[1px] bg-[#1c1e21]" style={{ boxShadow: PANEL_SHADOW }} />
      <div className="absolute left-[14%] right-[14%] top-[47%] h-[41%] rounded-[1px] bg-[#1c1e21]" style={{ boxShadow: PANEL_SHADOW }} />

      {/* moving metallic sheen: slides across as the door turns */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 -left-[20%] w-[220%]"
          style={{
            x: sheenX,
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.055) 40%, rgba(255,255,255,0.11) 44%, rgba(255,255,255,0.05) 48%, transparent 58%)",
          }}
        />
      </div>

      {/* matte black pull bar on the latch stile */}
      <div className="absolute left-[91.5%] top-[41%] h-[20%] w-[3%]">
        <div className="absolute inset-x-0 inset-y-[6%] rounded-full bg-[linear-gradient(90deg,#0b0b0c,#232325_40%,#0a0a0b)] shadow-[3px_4px_6px_rgba(0,0,0,0.6)]" />
        <div className="absolute left-[-20%] top-0 h-[3%] w-[140%] rounded-[1px] bg-[#0c0c0d]" />
        <div className="absolute bottom-0 left-[-20%] h-[3%] w-[140%] rounded-[1px] bg-[#0c0c0d]" />
      </div>

      {/* the face darkens as it turns away from the street light */}
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: shade }} />
    </div>
  );
}

/** Minimal matte black over-the-door hanger: a thin strap over the top edge ending in a hook. */
function Hanger() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 30 100"
      className="absolute left-1/2 top-0 overflow-visible"
      style={{ height: `${HOOK_Y + 1.2}%`, width: "auto", aspectRatio: "30 / 100", transform: "translateX(-50%) translateZ(0.6px)" }}
    >
      <defs>
        <linearGradient id="wd-hanger" x1="0" x2="1">
          <stop offset="0" stopColor="#0a0a0b" />
          <stop offset="0.45" stopColor="#252527" />
          <stop offset="1" stopColor="#0a0a0b" />
        </linearGradient>
      </defs>
      <rect x="9" y="-6" width="12" height="10" rx="1.5" fill="#0d0d0e" />
      <rect x="11.5" y="0" width="7" height="76" rx="2" fill="url(#wd-hanger)" />
      <path d="M15 72 L15 86 Q15 96 6.5 96 Q0 96 0 89" fill="none" stroke="url(#wd-hanger)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

interface HangingWreathProps {
  product: WreathProduct;
  sway: MotionValue<number>;
  tilt: MotionValue<number>;
  drop: MotionValue<number>;
  opacity: MotionValue<number>;
  shadow: boolean;
}

function HangingWreath({ product, sway, tilt, drop, opacity, shadow }: HangingWreathProps) {
  const hp = product.image.hangPoint ?? 0.04;
  const box: CSSProperties = {
    left: `${(100 - WREATH_W) / 2}%`,
    width: `${WREATH_W}%`,
    top: `calc(${HOOK_Y}% - ${hp} * ${WREATH_H}%)`,
    height: `${WREATH_H}%`,
    transformOrigin: `50% ${hp * 100}%`,
  };

  // The farther the wreath swings off the door, the farther and softer its shadow.
  const shadowX = useTransform(tilt, [0, 20], ["-4%", "-10%"]);
  const shadowY = useTransform(tilt, [0, 20], ["4.5%", "12%"]);
  const shadowScale = useTransform(tilt, [0, 20], [1, 1.07]);
  const shadowOpacity = useTransform(() => opacity.get() * (0.8 - Math.min(tilt.get(), 20) * 0.022));

  return (
    <>
      {shadow && (
        <motion.img
          aria-hidden="true"
          alt=""
          src={product.image.src}
          draggable={false}
          className="pointer-events-none absolute select-none object-contain [filter:brightness(0)_blur(3px)]"
          style={{ ...box, x: shadowX, y: shadowY, z: 0.3, scale: shadowScale, rotate: sway, opacity: shadowOpacity }}
        />
      )}
      <motion.div
        className="pointer-events-none absolute will-change-transform"
        style={{ ...box, rotate: sway, rotateX: tilt, y: drop, z: 1.5, opacity }}
      >
        <img
          src={product.image.src}
          alt=""
          draggable={false}
          decoding="async"
          className="block h-full w-full select-none object-contain [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.5))]"
        />
      </motion.div>
    </>
  );
}
