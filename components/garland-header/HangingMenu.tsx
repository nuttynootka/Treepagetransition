"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";
import { ChainLadder, closeDuration } from "./chain-physics";
import { GlassPlateFace } from "./GlassPlate";
import { hashString, PLATE_LIGHT_COLORS, plateGlints } from "./geometry";
import { useReducedMotion } from "./hooks";
import { cn } from "./parts";
import type { GarlandLink, LinkLike } from "./types";

interface HangingMenuProps {
  id: string;
  /** The tab's label, for screen readers ("Shop menu"). */
  label: string;
  items: GarlandLink[];
  open: boolean;
  activeHref: string;
  Link: LinkLike;
  onSelect: () => void;
}

/**
 * Frosted glass plates on silver chains, unrolling from under the
 * centre tab. Each plate swings, tilts and twists on its own, driven by the
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

  // Measure each plate's width and the height of the plates. The first plate hangs a short way
  // below the centre tab's bottom edge (the menu's top is tucked behind the tab).
  const measure = () => {
    const engine = engineRef.current;
    const first = plateRefs.current[0];
    if (!engine || !first) return;
    const widths = plateRefs.current.slice(0, items.length).map((el) => el?.offsetWidth ?? 160);
    engine.setGeometry(widths, first.offsetHeight, 22);
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
              <GlassPlateFace label={item.label} current={current} glints={glints[i]} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
