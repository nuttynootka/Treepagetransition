"use client";

import { useMemo, type CSSProperties, type PointerEvent } from "react";
import { hashString, snowflakeLights, snowflakePath, type TabPlacement } from "./geometry";
import { useSwing } from "./hooks";
import { cn, FairyLight, Frost } from "./parts";
import type { GarlandPage, LinkLike } from "./types";

const FLAKE_PATH = snowflakePath();

/** Label size scales with the snowflake, and shrinks a little for longer words. */
function labelSize(label: string): string {
  const n = label.length;
  if (n <= 5) return "max(13px, calc(var(--flake) * 0.135))";
  if (n <= 8) return "max(12px, calc(var(--flake) * 0.115))";
  return "max(11px, calc(var(--flake) * 0.1))";
}

interface SnowflakeTabProps {
  page: GarlandPage;
  active: boolean;
  placement: TabPlacement;
  motion: boolean;
  Link: LinkLike;
}

export function SnowflakeTab({ page, active, placement, motion, Link }: SnowflakeTabProps) {
  const seed = useMemo(() => hashString(page.href + page.label), [page.href, page.label]);
  const lights = useMemo(() => snowflakeLights(seed), [seed]);
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
        {/* Ribbon: starts tucked inside the greenery, ends at the snowflake's top tip. */}
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
            "relative -mt-[3%] block size-[var(--flake)] rounded-full outline-none",
            "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
            "[--gh-core:calc(var(--flake)*0.024)] [--gh-halo:calc(var(--flake)*0.115)]",
          )}
        >
          <span aria-hidden className="gh-aura pointer-events-none absolute -inset-[22%] rounded-full" />

          {/* Silhouette */}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            className={cn(
              "absolute inset-0 h-full w-full overflow-visible transition-[opacity,filter] duration-700",
              active
                ? "opacity-100 drop-shadow-[0_0_6px_rgba(255,245,235,0.55)]"
                : "opacity-50 drop-shadow-[0_6px_8px_rgba(0,0,0,0.7)] group-hover:opacity-70",
            )}
          >
            <defs>
              <linearGradient id={`gh-ice-${seed}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.5" stopColor="#e6f1ff" />
                <stop offset="1" stopColor="#fff3e4" />
              </linearGradient>
            </defs>
            <path d={FLAKE_PATH} fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={FLAKE_PATH} fill="none" stroke={`url(#gh-ice-${seed})`} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Lights along the outline */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 transition-opacity duration-700",
              active ? "opacity-100" : "opacity-60 group-hover:opacity-85",
            )}
          >
            {lights.map((l, i) => (
              <FairyLight key={i} light={l} />
            ))}
          </span>

          {/* Frosted glass plate */}
          <span className="absolute left-1/2 top-1/2 flex size-[58%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full transition-colors duration-700",
                active ? "bg-[radial-gradient(circle_at_50%_35%,rgba(255,245,235,0.18),transparent_70%)]" : "bg-black/20",
              )}
            />
            {/* Remounts each time this tab becomes active, so the bloom replays. */}
            <Frost key={active ? "on" : "off"} seed={seed} blooming={active} />
            <span
              key={active ? "t-on" : "t-off"}
              className={cn(
                "gh-title relative px-[8%] text-center font-semibold leading-[1.05] tracking-[0.04em] text-balance",
                "font-[family-name:var(--gh-font)] [text-shadow:0_1px_3px_rgba(0,0,0,0.65)]",
                active ? "is-blooming text-[#FFF8F0]" : "text-white/85 group-hover:text-white",
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
