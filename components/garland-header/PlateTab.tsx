"use client";

import { useMemo, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { GlassPlateFace } from "./GlassPlate";
import { hashString, PLATE_LIGHT_COLORS, plateGlints, type TabPlacement } from "./geometry";
import { useSwing } from "./hooks";
import { cn } from "./parts";

interface PlateTabProps {
  /** The slot: 0 = left, 1 = centre, 2 = right. The slot never moves; only the label changes. */
  pos: number;
  label: string;
  /** All labels the tabs can show, so every plate is as wide as the widest. */
  sizerLabels: string[];
  /** The label is faded out. */
  fading: boolean;
  /** The centre tab: the page being viewed. */
  current: boolean;
  /** For a tab whose label has a dropdown: is it open, and which element does it control. */
  expanded?: boolean;
  controls?: string;
  onPress: () => void;
  placement: TabPlacement;
  motion: boolean;
  /** The hanging menus, which unroll from under this tab (the centre tab only). */
  children?: ReactNode;
}

/**
 * A tab that is a frosted glass plate, the same as the menu plates, hanging from the
 * garland on two short chains. It always stays in its slot; only its label changes.
 */
export function PlateTab({
  pos,
  label,
  sizerLabels,
  fading,
  current,
  expanded,
  controls,
  onPress,
  placement,
  motion,
  children,
}: PlateTabProps) {
  const glints = useMemo(() => plateGlints(hashString(`tab-${pos}`)), [pos]);
  const { ref: swingRef, kick } = useSwing<HTMLDivElement>(motion);

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

  return (
    <li
      data-tab={pos}
      className="absolute top-[calc(var(--gt)+var(--g)*0.6)] w-max -translate-x-1/2 left-[var(--xn)] lg:left-[var(--xw)]"
      style={
        {
          "--xn": `${placement.xNarrow}%`,
          "--xw": `${placement.xWide}%`,
          "--rn": placement.ribbonNarrow,
          "--rw": placement.ribbonWide,
          "--xfn": placement.xNarrow / 100,
          "--xfw": placement.xWide / 100,
          "--gc": PLATE_LIGHT_COLORS[pos % PLATE_LIGHT_COLORS.length],
          zIndex: placement.layer,
        } as CSSProperties
      }
    >
      <div ref={swingRef} data-active={current ? "true" : "false"} className="gh-tab group relative z-[1] origin-top">
        {/* Two chains from inside the garland to the plate's top corners. */}
        <span aria-hidden className="relative block h-[calc(var(--g)*0.4+var(--rn))] w-full lg:h-[calc(var(--g)*0.4+var(--rw))]">
          <span className="gh-tab-chain left-[20%]" />
          <span className="gh-tab-chain right-[20%]" />
        </span>
        <span className="relative block">
          <span aria-hidden className="gh-aura pointer-events-none absolute -inset-x-[40%] -inset-y-[120%] rounded-full" />
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={controls}
            aria-current={current ? "page" : undefined}
            onClick={onPress}
            onPointerEnter={motion ? onPointerEnter : undefined}
            onPointerDown={motion ? onPointerDown : undefined}
            className={cn(
              "gh-menu-plate gh-tab-plate group/plate relative block h-[var(--menu-h)] min-w-[56px] cursor-pointer rounded-[8px] border-0 p-[1.5px] outline-none",
              "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
              (current || expanded) && "is-current",
            )}
          >
            <GlassPlateFace label={label} current={current} glints={glints} sizerLabels={sizerLabels} fading={fading} />
          </button>
        </span>
      </div>
      {children}
    </li>
  );
}
