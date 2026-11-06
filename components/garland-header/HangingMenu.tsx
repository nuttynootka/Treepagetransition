"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
 * snowflake. Each plate is nested inside the one above it and folds back 90°
 * around its top edge, so the whole chain rolls up like a rug. Opening unrolls
 * it one plate at a time, top to bottom; closing rolls it back up, bottom first,
 * until it is hidden behind the garland.
 */
export function HangingMenu({ id, label, items, open, activeHref, Link, onSelect }: HangingMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // A closed menu can't be tabbed into or read out.
  useEffect(() => {
    if (ref.current) ref.current.inert = !open;
  }, [open]);

  let rungs: ReactNode = null;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const current = activeHref === item.href;
    rungs = (
      <div className="gh-rung" data-first={i === 0 ? "" : undefined} style={{ "--i": i } as CSSProperties}>
        {/* Two chains: the long lead from the garland for the first plate, short links after. */}
        <span aria-hidden className={cn("relative block", i === 0 ? "h-[var(--lead)]" : "h-[14px] -mt-[3px]")}>
          <span className="gh-chain gh-chain-l" />
          <span className="gh-chain gh-chain-r" />
        </span>
        <Link
          href={item.href}
          aria-current={current ? "page" : undefined}
          onClick={onSelect}
          className={cn(
            "gh-menu-plate group/plate relative block h-[var(--menu-h)] rounded-[11px] p-[1.5px] outline-none",
            "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80",
            current && "is-current",
          )}
        >
          <span className="relative flex h-full items-center justify-center overflow-hidden rounded-[9.5px] border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-5px_10px_rgba(0,0,0,0.35)] transition-colors duration-300",
                current
                  ? "bg-[linear-gradient(170deg,rgba(255,245,235,0.2),rgba(9,18,14,0.7)_60%)]"
                  : "bg-[linear-gradient(170deg,rgba(255,255,255,0.08),rgba(7,14,11,0.8)_60%)] group-hover/plate:bg-[linear-gradient(170deg,rgba(255,245,235,0.16),rgba(9,18,14,0.74)_60%)]",
              )}
            />
            <span
              className={cn(
                "relative px-3 text-center font-semibold uppercase leading-none tracking-[0.08em] whitespace-nowrap",
                "font-[family-name:var(--gh-font)] text-[length:var(--menu-font)] [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]",
                current ? "text-[#FFF8F0]" : "text-white/90 group-hover/plate:text-white",
              )}
            >
              {item.label}
            </span>
          </span>
        </Link>
        {rungs && <div className="gh-rung-next absolute inset-x-0 top-full">{rungs}</div>}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      id={id}
      role="group"
      aria-label={`${label} menu`}
      data-open={open ? "true" : "false"}
      className="gh-ladder absolute top-0 z-0"
      style={{ "--n": items.length } as CSSProperties}
    >
      {rungs}
    </div>
  );
}
