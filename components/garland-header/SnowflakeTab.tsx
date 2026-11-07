"use client";

import { useMemo, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { crystalGlints, GLINT_COLORS, hashString, type Glint, type TabPlacement } from "./geometry";
import { useSwing } from "./hooks";
import { cn, Frost } from "./parts";
import type { CrystalImage, GarlandPage, LinkLike } from "./types";

/**
 * One label size for every plate, set by the longest label so it fits edge to edge.
 * Snug fit: capitals in this serif with 0.04em spacing measure about 0.73em per letter, and the
 * longest label fills 90% of the plate, leaving a thin margin inside the rim.
 */
function labelSize(longest: number): string {
  const fit = 0.9 / (longest * 0.73);
  return `calc(var(--flake) * var(--plate) * ${fit.toFixed(4)})`;
}

function GlintSpark({ glint }: { glint: Glint }) {
  return (
    <span
      data-fairy-light=""
      data-rest={glint.rest ? "true" : "false"}
      className={cn("gh-glint", glint.kind === "star" ? "gh-glint-star" : "gh-glint-fleck")}
      style={
        {
          left: `${glint.x}%`,
          top: `${glint.y}%`,
          "--gs": `calc(var(--flake) * ${glint.size})`,
          "--gc": GLINT_COLORS[glint.color],
          "--dur": `${glint.dur}s`,
          "--delay": `${glint.delay}s`,
        } as CSSProperties
      }
    >
      <span className="gh-glint-spark" />
      <span className="gh-light-warm" />
    </span>
  );
}

interface SnowflakeTabProps {
  page: GarlandPage;
  active: boolean;
  placement: TabPlacement;
  crystal: CrystalImage;
  /** Flip the picture left-to-right, so a repeated design looks different. */
  mirrored: boolean;
  /** Length of the longest label in the header. */
  labelChars: number;
  motion: boolean;
  Link: LinkLike;
  /** For a menu snowflake: whether its hanging menu is down, and how to toggle it. */
  menu?: { id: string; open: boolean; onToggle: () => void };
  /** The hanging menu, rendered behind this snowflake. */
  children?: ReactNode;
}

export function SnowflakeTab({
  page,
  active,
  placement,
  crystal,
  mirrored,
  labelChars,
  motion,
  Link,
  menu,
  children,
}: SnowflakeTabProps) {
  const seed = useMemo(() => hashString((page.href ?? "") + page.label), [page.href, page.label]);
  const glints = useMemo(() => crystalGlints(seed, 0.44, 12), [seed]);
  // Each crystal turns on its ribbon at its own pace (3.6–5.2s each way).
  const turnStyle = useMemo(() => {
    const dur = 3.6 + (seed % 1000) / 625;
    return { "--turn-dur": `${dur.toFixed(2)}s`, "--turn-delay": `${(-((seed >> 10) % 1000) / 100).toFixed(2)}s` } as CSSProperties;
  }, [seed]);
  const { ref: swingRef, kick } = useSwing<HTMLDivElement>(motion);

  // Mouse or pen brushing past: swing away from where it came from.
  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dir = e.movementX !== 0 ? Math.sign(e.movementX) : e.clientX < r.left + r.width / 2 ? 1 : -1;
    kick(-dir * (0.32 + Math.min(Math.abs(e.movementX), 30) * 0.008));
  };
  // A tap or click: a small nudge away from the touch point.
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    kick(e.clientX < r.left + r.width / 2 ? -0.38 : 0.38);
  };

  const faceClass = cn(
    "relative -mt-[1%] block size-[var(--flake)] cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none",
    "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
    "[--gh-halo:calc(var(--flake)*0.14)]",
  );

  const face = (
    <>
          <span aria-hidden className="gh-aura pointer-events-none absolute -inset-[20%] rounded-full" />

          {/* Everything that turns slowly on the ribbon, like the crystals in the reference video. */}
          <span className="gh-turn pointer-events-none absolute inset-0" style={turnStyle}>
            {/* The leaded-glass crystal, with light sweeping across its facets and
                coloured Christmas lights reflecting in them. */}
            <span className={cn("gh-crystal absolute inset-0 isolate", mirrored && "-scale-x-100")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crystal.src}
                alt=""
                width={440}
                height={440}
                draggable={false}
                decoding="async"
                className="absolute inset-0 h-full w-full select-none"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={crystal.src} alt="" draggable={false} className="gh-shine gh-shine-a absolute inset-0 h-full w-full" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={crystal.src} alt="" draggable={false} className="gh-shine gh-shine-b absolute inset-0 h-full w-full" />
              {/* Iridescent sheen in Christmas-light colours across whole facets, like the
                  coated crystal in the reference videos; it shifts as the crystal turns. */}
              <span
                className="gh-iris absolute inset-0"
                style={{ maskImage: `url("${crystal.src}")`, WebkitMaskImage: `url("${crystal.src}")` }}
              />
              <span
                className="gh-fire absolute inset-0"
                style={{ maskImage: `url("${crystal.src}")`, WebkitMaskImage: `url("${crystal.src}")` }}
              />
            </span>

            {/* Glints of light caught in the facets */}
            <span aria-hidden className="gh-glints absolute inset-0">
              {glints.map((g, i) => (
                <GlintSpark key={i} glint={g} />
              ))}
            </span>

            {/* Frosted glass plate with a silver rim, sized by --plate so the label fits */}
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 size-[calc(var(--plate)*100%+5px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_200deg,#f4f7fb,#9aa3ad,#ffffff,#7d8690,#e9eef4,#a7b0ba,#f4f7fb)] shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
            />
          <span className="absolute left-1/2 top-1/2 flex size-[calc(var(--plate)*100%)] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full transition-colors duration-700",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-6px_12px_rgba(0,0,0,0.35)]",
                active
                  ? "bg-[linear-gradient(170deg,rgba(255,245,235,0.16),rgba(9,18,14,0.72)_55%)]"
                  : "bg-[linear-gradient(170deg,rgba(255,255,255,0.07),rgba(7,14,11,0.8)_55%)]",
              )}
            />
            {/* Remounts each time this tab becomes active, so the bloom replays. */}
            <Frost key={active ? "on" : "off"} seed={seed} blooming={active} />
            <span
              key={active ? "t-on" : "t-off"}
              className={cn(
                "gh-title relative whitespace-nowrap text-center font-semibold uppercase leading-none tracking-[0.04em]",
                "font-[family-name:var(--gh-font)] [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]",
                active ? "is-blooming text-[#FFF8F0]" : "text-white/90 group-hover:text-white",
              )}
              style={{ fontSize: labelSize(labelChars) }}
            >
              {page.label}
            </span>
          </span>
          </span>
    </>
  );

  return (
    <li
      className="absolute top-[calc(var(--gt)+var(--g)*0.6)] w-[var(--flake)] -translate-x-1/2 left-[var(--xn)] lg:left-[var(--xw)]"
      style={
        {
          "--xn": `${placement.xNarrow}%`,
          "--xw": `${placement.xWide}%`,
          "--rn": placement.ribbonNarrow,
          "--rw": placement.ribbonWide,
          "--xfn": placement.xNarrow / 100,
          "--xfw": placement.xWide / 100,
          zIndex: menu?.open ? placement.layer - 1 : placement.layer,
        } as CSSProperties
      }
      data-menu-root={menu ? menu.id : undefined}
    >
      <div ref={swingRef} data-active={active ? "true" : "false"} className="gh-flake group relative z-[1] origin-top">
        {/* Ribbon: starts tucked inside the greenery, ends at the crystal's top tip. */}
        <span
          aria-hidden
          className="mx-auto block h-[calc(var(--g)*0.4+var(--rn))] w-px bg-linear-to-b from-[#cdb27a]/30 via-[#e9d7b0]/70 to-[#f6ead0]/90 lg:h-[calc(var(--g)*0.4+var(--rw))]"
        />
        {menu ? (
          <button
            type="button"
            aria-expanded={menu.open}
            aria-controls={menu.id}
            onClick={menu.onToggle}
            onPointerEnter={motion ? onPointerEnter : undefined}
            onPointerDown={motion ? onPointerDown : undefined}
            className={faceClass}
          >
            {face}
          </button>
        ) : (
          <Link
            href={page.href ?? "/"}
            aria-current={active ? "page" : undefined}
            onPointerEnter={motion ? onPointerEnter : undefined}
            onPointerDown={motion ? onPointerDown : undefined}
            className={faceClass}
          >
            {face}
          </Link>
        )}
      </div>
      {children}
    </li>
  );
}
