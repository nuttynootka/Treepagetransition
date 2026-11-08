"use client";

import { useMemo, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { GlassPlateFace } from "./GlassPlate";
import { hashString, PLATE_LIGHT_COLORS, plateGlints, type TabPlacement } from "./geometry";
import { useSwing } from "./hooks";
import { cn } from "./parts";
import type { GarlandPage, LinkLike } from "./types";

interface PlateTabProps {
  page: GarlandPage;
  index: number;
  active: boolean;
  placement: TabPlacement;
  motion: boolean;
  Link: LinkLike;
  /** For a menu tab: whether its hanging menu is down, and how to toggle it. */
  menu?: { id: string; open: boolean; onToggle: () => void };
  /** The hanging menu, which unrolls from under this tab. */
  children?: ReactNode;
}

/**
 * A tab that is a frosted glass plate, the same as the menu plates, hanging from the
 * garland on two short chains. A menu tab's hanging menu unrolls down from its bottom edge.
 */
export function PlateTab({ page, index, active, placement, motion, Link, menu, children }: PlateTabProps) {
  const glints = useMemo(() => plateGlints(hashString(page.label)), [page.label]);
  const { ref: swingRef, kick } = useSwing<HTMLDivElement>(motion);
  const current = active || !!menu?.open;

  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dir = e.movementX !== 0 ? Math.sign(e.movementX) : e.clientX < r.left + r.width / 2 ? 1 : -1;
    kick(-dir * (0.32 + Math.min(Math.abs(e.movementX), 30) * 0.008));
  };
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    kick(e.clientX < r.left + r.width / 2 ? -0.38 : 0.38);
  };

  const plateClass = cn(
    "gh-menu-plate gh-tab-plate group/plate relative block h-[var(--menu-h)] min-w-[56px] cursor-pointer rounded-[8px] border-0 p-[1.5px] outline-none",
    "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
    current && "is-current",
  );
  const face = <GlassPlateFace label={page.label} current={current} glints={glints} />;

  return (
    <li
      className="absolute top-[calc(var(--gt)+var(--g)*0.6)] w-max -translate-x-1/2 left-[var(--xn)] lg:left-[var(--xw)]"
      style={
        {
          "--xn": `${placement.xNarrow}%`,
          "--xw": `${placement.xWide}%`,
          "--rn": placement.ribbonNarrow,
          "--rw": placement.ribbonWide,
          "--xfn": placement.xNarrow / 100,
          "--xfw": placement.xWide / 100,
          "--gc": PLATE_LIGHT_COLORS[index % PLATE_LIGHT_COLORS.length],
          zIndex: menu?.open ? placement.layer - 1 : placement.layer,
        } as CSSProperties
      }
      data-menu-root={menu ? menu.id : undefined}
    >
      <div ref={swingRef} data-active={current ? "true" : "false"} className="gh-flake group relative z-[1] origin-top">
        {/* Two chains from inside the garland to the plate's top corners. */}
        <span
          aria-hidden
          className="relative block h-[calc(var(--g)*0.4+var(--rn))] w-full lg:h-[calc(var(--g)*0.4+var(--rw))]"
        >
          <span className="gh-tab-chain left-[20%]" />
          <span className="gh-tab-chain right-[20%]" />
        </span>
        <span className="relative block">
          <span aria-hidden className="gh-aura pointer-events-none absolute -inset-x-[40%] -inset-y-[120%] rounded-full" />
          {menu ? (
            <button
              type="button"
              aria-expanded={menu.open}
              aria-controls={menu.id}
              onClick={menu.onToggle}
              onPointerEnter={motion ? onPointerEnter : undefined}
              onPointerDown={motion ? onPointerDown : undefined}
              className={plateClass}
            >
              {face}
            </button>
          ) : (
            <Link
              href={page.href ?? "/"}
              aria-current={active ? "page" : undefined}
              onPointerEnter={motion ? onPointerEnter : undefined}
              onPointerDown={motion ? onPointerDown : undefined}
              className={plateClass}
            >
              {face}
            </Link>
          )}
        </span>
      </div>
      {children}
    </li>
  );
}
