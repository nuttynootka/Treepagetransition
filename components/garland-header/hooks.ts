"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** True when the visitor has asked their device to reduce motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * A hanging ornament: a damped pendulum that swings around its top edge.
 * Call `kick(impulse)` to push it (radians per second; negative swings right).
 * It writes the transform straight to the element, so React never re-renders.
 */
export function useSwing<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  const s = useRef({ angle: 0, velocity: 0, raf: 0, last: 0 });

  // Natural swing period ≈ 1.7s, light damping so it settles in a few swings.
  const STIFFNESS = (2 * Math.PI / 1.7) ** 2;
  const DAMPING = 2 * 0.16 * Math.sqrt(STIFFNESS);
  const MAX_ANGLE = 0.15; // ≈ 8.5°

  const step = useCallback(
    (now: number) => {
      const st = s.current;
      const el = ref.current;
      const dt = Math.min(0.032, (now - st.last) / 1000);
      st.last = now;
      st.velocity += (-STIFFNESS * st.angle - DAMPING * st.velocity) * dt;
      st.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, st.angle + st.velocity * dt));
      if (Math.abs(st.angle) < 0.0006 && Math.abs(st.velocity) < 0.002) {
        st.angle = st.velocity = 0;
        st.raf = 0;
        if (el) el.style.transform = "";
        return;
      }
      if (el) el.style.transform = `rotate(${st.angle.toFixed(4)}rad)`;
      st.raf = requestAnimationFrame(step);
    },
    [STIFFNESS, DAMPING],
  );

  const kick = useCallback(
    (impulse: number) => {
      if (!enabled) return;
      const st = s.current;
      st.velocity = Math.max(-0.9, Math.min(0.9, st.velocity + impulse));
      if (!st.raf) {
        st.last = performance.now();
        st.raf = requestAnimationFrame(step);
      }
    },
    [enabled, step],
  );

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);
  return { ref, kick };
}

/**
 * Lights near the pointer (mouse, pen or finger) glow a little warmer.
 * Sets a `--warm` value (0–1) on every `[data-fairy-light]` inside `root`.
 */
export function useWarmPointer(root: RefObject<HTMLElement | null>, enabled: boolean, radius = 120) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;

    let lights: HTMLElement[] = [];
    const current = new WeakMap<HTMLElement, number>();
    const collect = () => {
      lights = Array.from(el.querySelectorAll<HTMLElement>("[data-fairy-light]"));
    };
    collect();
    const observer = new MutationObserver(collect);
    observer.observe(el, { childList: true, subtree: true });

    let px = 0;
    let py = 0;
    let inside = false;
    let frame = 0;
    let fadeTimer = 0;

    const update = () => {
      frame = 0;
      // Read every position first, then write, so the browser lays out once.
      const rects = lights.map((l) => l.getBoundingClientRect());
      for (let i = 0; i < lights.length; i++) {
        let warm = 0;
        if (inside) {
          const d = Math.hypot(rects[i].left - px, rects[i].top - py);
          if (d < radius) {
            const t = 1 - d / radius;
            warm = t * t * (3 - 2 * t); // smoothstep
          }
        }
        const prev = current.get(lights[i]) ?? 0;
        if (Math.abs(prev - warm) > 0.02 || (warm === 0 && prev !== 0)) {
          lights[i].style.setProperty("--warm", warm.toFixed(2));
          current.set(lights[i], warm);
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onMove = (e: PointerEvent) => {
      window.clearTimeout(fadeTimer);
      px = e.clientX;
      py = e.clientY;
      inside = true;
      schedule();
    };
    const onLeave = () => {
      inside = false;
      schedule();
    };
    // A finger lifts: let the warmth linger a moment, then fade.
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(onLeave, 700);
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerdown", onMove, { passive: true });
    el.addEventListener("pointerup", onUp, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    el.addEventListener("pointercancel", onLeave, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(fadeTimer);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onLeave);
    };
  }, [root, enabled, radius]);
}

/** Checks whether an image URL loads, so a missing garland photo can show a placeholder. */
export function useImageStatus(src: string | undefined): "loading" | "ok" | "missing" {
  const [status, setStatus] = useState<"loading" | "ok" | "missing">(src ? "loading" : "missing");
  useEffect(() => {
    if (!src) {
      setStatus("missing");
      return;
    }
    let live = true;
    setStatus("loading");
    const img = new Image();
    img.onload = () => live && setStatus("ok");
    img.onerror = () => live && setStatus("missing");
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  return status;
}
