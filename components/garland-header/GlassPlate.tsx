"use client";

import type { CSSProperties } from "react";
import type { PlateGlint } from "./geometry";
import { cn } from "./parts";

/**
 * The inside of a frosted glass plate: light frosted glass, a reflection that slides
 * across it as the plate twists, the word etched in dark, and tiny glints of light.
 * Shared by the tabs and the hanging menu plates so they look identical.
 *
 * Put it inside an element with the `gh-menu-plate` class (the silver bevel) and a
 * `--gc` colour for the light it reflects.
 */
export function GlassPlateFace({
  label,
  current,
  glints,
  sizerLabels,
  fading = false,
}: {
  label: string;
  current: boolean;
  glints: PlateGlint[];
  /** Other labels this plate may show. The plate is as wide as the widest, so changing the label never resizes it. */
  sizerLabels?: string[];
  /** Fade the label out (it fades back in when this goes false). */
  fading?: boolean;
}) {
  return (
    <>
      <span className="relative flex h-full items-center justify-center overflow-hidden rounded-[6.5px] border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
        <span aria-hidden className={cn("gh-frost-glass absolute inset-0", current && "is-active")} />
        <span aria-hidden className="gh-plate-sheen pointer-events-none absolute inset-y-0 left-[20%] w-[60%]" />
        <span
          className={cn(
            "gh-etched relative grid px-[7px] text-center font-semibold uppercase leading-none tracking-[0.06em] whitespace-nowrap",
            "font-[family-name:var(--gh-font)] text-[length:var(--menu-font)]",
          )}
        >
          {sizerLabels?.map((l) => (
            <span key={l} aria-hidden className="invisible col-start-1 row-start-1">
              {l}
            </span>
          ))}
          <span className={cn("col-start-1 row-start-1 transition-opacity duration-150 ease-linear", fading && "opacity-0")}>
            {label}
          </span>
        </span>
      </span>
      {/* Tiny, faint glints of light along the edges: a pinpoint, a few pixels across, no halo. */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {glints.slice(0, 4).map((g, k) => (
          <span
            key={k}
            className="gh-tiny gh-tiny-soft"
            style={
              {
                left: `${g.x}%`,
                top: `${g.y}%`,
                "--ts": g.kind === "star" ? "4px" : "2.5px",
                "--dur": `${(g.dur * 1.6).toFixed(2)}s`,
                "--delay": `${g.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </>
  );
}
