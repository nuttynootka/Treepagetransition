"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";
import { ChainLadder, closeDuration } from "./chain-physics";
import { hashString, PLATE_LIGHT_COLORS, plateGlints } from "./geometry";
import { useReducedMotion } from "./hooks";
import { cn } from "./parts";
import type { GarlandLink, LinkLike } from "./types";

interface HangingMenuProps {
  id: string;
  /** The snowflake's label, for screen readers ("Shop menu"). */
  label: string;
  items: GarlandLink[];
  open: boolean;
  activeHref: string;
  Link: LinkLike;
  onSelect: () => void;
}

/**
 * Frosted glass plates on silver chains, hanging from the garland behind the
 * snowflake. Each plate swings, tilts and twists on its own, driven by the
 * physics in chain-physics.ts. Opening drops them one by one until their chains
 * catch; closing reels them back up behind the garland, bottom plate first.
 */
export function HangingMenu({ id, label, items, open, activeHref, Link, onSelect }: HangingMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chainRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const engineRef = useRef<ChainLadder | null>(null);
  const reducedMotion = useReducedMotion();
  const glints = useMemo(() => items.map((item) => plateGlints(hashString(item.href))), [items]);

  // Measure plate size, and how far the first plate hangs: just below the lowest
  // snowflake, since the menu drops down the middle, behind the logo and snowflakes.
  const measure = () => {
    const root = rootRef.current;
    const engine = engineRef.current;
    const first = plateRefs.current[0];
    if (!root || !engine || !first) return;
    const flakes = root.closest("nav")?.querySelectorAll(".gh-flake > a, .gh-flake > button") ?? [];
    const bottom = Math.max(0, ...Array.from(flakes, (f) => f.getBoundingClientRect().bottom));
    const top = root.getBoundingClientRect().top;
    const widths = plateRefs.current.slice(0, items.length).map((el) => el?.offsetWidth ?? 160);
    engine.setGeometry(widths, first.offsetHeight, bottom ? bottom - top + 8 : 160);
  };

  useEffect(() => {
    const plates = plateRefs.current.slice(0, items.length) as HTMLElement[];
    const chains = items.map((_, i) => [chainRefs.current[i * 2]!, chainRefs.current[i * 2 + 1]!] as [HTMLElement, HTMLElement]);
    const engine = new ChainLadder({ plates, chains, reducedMotion: false });
    engineRef.current = engine;
    measure();
    // Plates size to their labels, so re-measure when they change (for example once the font loads).
    const ro = new ResizeObserver(measure);
    plates.forEach((el) => ro.observe(el));
    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => engineRef.current?.setReducedMotion(reducedMotion), [reducedMotion]);

  useEffect(() => {
    const engine = engineRef.current;
    if (rootRef.current) rootRef.current.inert = !open;
    if (!engine) return;
    if (open) {
      measure();
      engine.open();
    } else engine.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Brushing a plate with the mouse pushes it in the direction of travel.
  const onPointerMove = (i: number) => (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch" || (!e.movementX && !e.movementY)) return;
    const r = rootRef.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-260, Math.min(260, v));
    engineRef.current?.poke(i, e.clientX - r.left, e.clientY - r.top, clamp(e.movementX * 14), clamp(e.movementY * 7));
  };
  // A tap pushes the plate away from the finger.
  const onPointerDown = (i: number) => (e: PointerEvent<HTMLElement>) => {
    const r = rootRef.current!.getBoundingClientRect();
    const plate = e.currentTarget.getBoundingClientRect();
    const dir = e.clientX < plate.left + plate.width / 2 ? 1 : -1;
    engineRef.current?.poke(i, e.clientX - r.left, e.clientY - r.top, dir * 220, -30);
  };

  return (
    <div
      ref={rootRef}
      id={id}
      role="group"
      aria-label={`${label} menu`}
      data-open={open ? "true" : "false"}
      className="gh-ladder absolute top-0 z-0"
      style={{ "--n": items.length, "--close-ms": `${Math.round(closeDuration(items.length) * 1000)}ms` } as CSSProperties}
    >
      {/* Chains first, so they pass behind the plates. */}
      {items.map((item, i) => (
        <span key={`c-${item.href}`} aria-hidden>
          <span ref={(el) => void (chainRefs.current[i * 2] = el)} className="gh-chain" />
          <span ref={(el) => void (chainRefs.current[i * 2 + 1] = el)} className="gh-chain" />
        </span>
      ))}
      {items.map((item, i) => {
        const current = activeHref === item.href;
        return (
          <div
            key={item.href}
            ref={(el) => void (plateRefs.current[i] = el)}
            className="gh-plate-body absolute left-0 top-0 w-max origin-top"
            style={{ "--gc": PLATE_LIGHT_COLORS[i % PLATE_LIGHT_COLORS.length] } as CSSProperties}
            onPointerMove={onPointerMove(i)}
            onPointerDown={onPointerDown(i)}
          >
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={onSelect}
              className={cn(
                "gh-menu-plate group/plate relative block h-[var(--menu-h)] rounded-[8px] p-[1.5px] outline-none",
                "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
                current && "is-current",
              )}
            >
              <span className="relative flex h-full items-center justify-center overflow-hidden rounded-[6.5px] border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-5px_10px_rgba(0,0,0,0.35)] transition-colors duration-300",
                    current
                      ? "bg-[linear-gradient(170deg,rgba(255,245,235,0.2),rgba(9,18,14,0.7)_60%)]"
                      : "bg-[linear-gradient(170deg,rgba(255,255,255,0.08),rgba(7,14,11,0.8)_60%)] group-hover/plate:bg-[linear-gradient(170deg,rgba(255,245,235,0.16),rgba(9,18,14,0.74)_60%)]",
                  )}
                />
                {/* A reflection of that plate's light, sliding across the glass as the plate twists. */}
                <span aria-hidden className="gh-plate-sheen pointer-events-none absolute inset-y-0 left-[20%] w-[60%]" />
                <span
                  className={cn(
                    "relative px-[7px] text-center font-semibold uppercase leading-none tracking-[0.04em] whitespace-nowrap",
                    "font-[family-name:var(--gh-font)] text-[length:var(--menu-font)] [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]",
                    current ? "text-[#FFF8F0]" : "text-white/90 group-hover/plate:text-white",
                  )}
                >
                  {item.label}
                </span>
              </span>
              <span aria-hidden className="pointer-events-none absolute inset-0">
                {glints[i].map((g, k) => (
                  <span
                    key={k}
                    data-fairy-light=""
                    className={cn("gh-glint", g.kind === "star" ? "gh-glint-star" : "gh-glint-fleck")}
                    style={
                      {
                        left: `${g.x}%`,
                        top: `${g.y}%`,
                        "--gs": `${g.size}px`,
                        "--dur": `${g.dur}s`,
                        "--delay": `${g.delay}s`,
                      } as CSSProperties
                    }
                  >
                    <span className="gh-glint-spark" />
                    <span className="gh-light-warm" />
                  </span>
                ))}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
