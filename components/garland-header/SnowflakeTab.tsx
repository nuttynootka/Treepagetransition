"use client";

import { useMemo, type CSSProperties, type PointerEvent } from "react";
import { crystalGlints, GLINT_COLORS, hashString, type Glint, type TabPlacement } from "./geometry";
import { useSwing } from "./hooks";
import { cn, Frost } from "./parts";
import type { CrystalImage, GarlandPage, LinkLike } from "./types";

/** Label size scales with the snowflake, and shrinks a little for longer words. */
function labelSize(label: string): string {
  const n = label.length;
  const k = n <= 4 ? 0.095 : n <= 6 ? 0.082 : n <= 8 ? 0.068 : 0.06;
  return `max(10px, calc(var(--flake) * ${k}))`;
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
  motion: boolean;
  Link: LinkLike;
}

export function SnowflakeTab({ page, active, placement, crystal, motion, Link }: SnowflakeTabProps) {
  const seed = useMemo(() => hashString(page.href + page.label), [page.href, page.label]);
  const glints = useMemo(() => crystalGlints(seed, crystal.plate), [seed, crystal.plate]);
  const { ref: swingRef, kick } = useSwing<HTMLDivElement>(motion);

  // Mouse or pen brushing past: swing away from where it came from.
  const onPointerEnter = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dir = e.movementX !== 0 ? Math.sign(e.movementX) : e.clientX < r.left + r.width / 2 ? 1 : -1;
    kick(-dir * (0.32 + Math.min(Math.abs(e.movementX), 30) * 0.008));
  };
  // A tap or click: a small nudge away from the touch point.
  const onPointerDown = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    kick(e.clientX < r.left + r.width / 2 ? -0.38 : 0.38);
  };

  return (
    <li
      className="absolute top-[calc(var(--g)*0.6)] w-[var(--flake)] -translate-x-1/2 left-[var(--xn)] md:left-[var(--xw)]"
      style={
        {
          "--xn": `${placement.xNarrow}%`,
          "--xw": `${placement.xWide}%`,
          "--rn": `${placement.ribbonNarrow}px`,
          "--rw": `${placement.ribbonWide}px`,
        } as CSSProperties
      }
    >
      <div ref={swingRef} data-active={active ? "true" : "false"} className="gh-flake group origin-top">
        {/* Ribbon: starts tucked inside the greenery, ends at the crystal's top tip. */}
        <span
          aria-hidden
          className="mx-auto block h-[calc(var(--g)*0.4+var(--rn))] w-px bg-linear-to-b from-[#cdb27a]/30 via-[#e9d7b0]/70 to-[#f6ead0]/90 md:h-[calc(var(--g)*0.4+var(--rw))]"
        />
        <Link
          href={page.href}
          aria-current={active ? "page" : undefined}
          onPointerEnter={motion ? onPointerEnter : undefined}
          onPointerDown={motion ? onPointerDown : undefined}
          className={cn(
            "relative -mt-[1%] block size-[var(--flake)] rounded-full outline-none",
            "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
            "[--gh-halo:calc(var(--flake)*0.14)]",
          )}
        >
          <span aria-hidden className="gh-aura pointer-events-none absolute -inset-[20%] rounded-full" />

          {/* The leaded-glass crystal */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={crystal.src}
            alt=""
            width={440}
            height={440}
            draggable={false}
            decoding="async"
            className="gh-crystal pointer-events-none absolute inset-0 h-full w-full select-none"
          />

          {/* Glints of light caught in the facets */}
          <span aria-hidden className="gh-glints pointer-events-none absolute inset-0">
            {glints.map((g, i) => (
              <GlintSpark key={i} glint={g} />
            ))}
          </span>

          {/* Frosted glass plate, sized to sit inside the crystal's silver rim */}
          <span
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-md"
            style={{ width: `${crystal.plate * 100}%`, height: `${crystal.plate * 100}%` }}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full transition-colors duration-700",
                active ? "bg-[radial-gradient(circle_at_50%_30%,rgba(255,245,235,0.16),rgba(6,14,11,0.45)_75%)]" : "bg-black/30",
              )}
            />
            {/* Remounts each time this tab becomes active, so the bloom replays. */}
            <Frost key={active ? "on" : "off"} seed={seed} blooming={active} />
            <span
              key={active ? "t-on" : "t-off"}
              className={cn(
                "gh-title relative px-[4%] text-center font-semibold leading-[1.05] tracking-[0.02em] text-balance",
                "font-[family-name:var(--gh-font)] [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]",
                active ? "is-blooming text-[#FFF8F0]" : "text-white/90 group-hover:text-white",
              )}
              style={{ fontSize: labelSize(page.label) }}
            >
              {page.label}
            </span>
          </span>
        </Link>
      </div>
    </li>
  );
}
