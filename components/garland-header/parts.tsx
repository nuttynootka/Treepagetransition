"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { frostStrokes, garlandLights, ovalLights, type LightPoint } from "./geometry";
import { useImageStatus } from "./hooks";
import type { LinkLike } from "./types";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------

export function FairyLight({ light, className }: { light: LightPoint; className?: string }) {
  return (
    <span
      data-fairy-light=""
      className={cn("gh-light", className)}
      style={{ left: `${light.x}%`, top: `${light.y}%`, "--dur": `${light.dur}s`, "--delay": `${light.delay}s` } as CSSProperties}
    >
      <span className="gh-light-twinkle" />
      <span className="gh-light-warm" />
    </span>
  );
}

// ---------------------------------------------------------------------------

interface GarlandProps {
  src?: string;
  fit: "cover" | "repeat";
}

/**
 * Your garland photo across the top, with two light strands woven over it.
 * If the photo is missing, a dark evergreen band stands in and says where
 * the file goes.
 */
export function Garland({ src, fit }: GarlandProps) {
  const status = useImageStatus(src);
  const lights = useMemo(() => garlandLights(), []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[var(--g)]">
      {status === "missing" ? (
        <div className="absolute inset-x-0 top-0 h-[88%] overflow-hidden rounded-b-[45%_40%] bg-[radial-gradient(120%_140%_at_50%_0%,#2a5a3f_0%,#18392a_45%,#0d2219_100%)] shadow-[0_14px_24px_-6px_rgba(0,0,0,0.7),inset_0_-10px_18px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(115deg,rgba(120,180,140,0.18)_0_2px,transparent_2px_9px),repeating-linear-gradient(65deg,rgba(20,50,35,0.5)_0_3px,transparent_3px_11px)]" />
          <p className="absolute left-2 top-1.5 z-10 m-0 rounded-full bg-black/55 px-2 py-0.5 text-[9px] tracking-wide text-white/70 sm:left-3 sm:top-2 sm:text-[10px]">
            <span className="sm:hidden">Add garland photo</span>
            <span className="hidden sm:inline">
              Garland photo goes here: <span className="font-mono">public/garland/garland.png</span>
            </span>
          </p>
        </div>
      ) : fit === "repeat" ? (
        <div
          className="absolute inset-0 bg-repeat-x drop-shadow-[0_12px_14px_rgba(0,0,0,0.65)]"
          style={{ backgroundImage: `url("${src}")`, backgroundSize: "auto 100%", backgroundPosition: "center top" }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center drop-shadow-[0_12px_14px_rgba(0,0,0,0.65)]"
        />
      )}
      {/* Seats the garland against the top edge. */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-black/45 to-transparent" />
      <div className="gh-glow-soft absolute inset-0 [--gh-core:2.6px] [--gh-halo:13px] md:[--gh-core:3.2px] md:[--gh-halo:16px]">
        {lights.map((l, i) => (
          <FairyLight key={i} light={l} className={l.dense ? "hidden sm:block" : undefined} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface LogoFrameProps {
  href: string;
  logo?: ReactNode;
  logoSrc?: string;
  logoAlt: string;
  Link: LinkLike;
}

/** The centred logo in a frosted oval, ringed by its own always-on lights. */
export function LogoFrame({ href, logo, logoSrc, logoAlt, Link }: LogoFrameProps) {
  const lights = useMemo(() => ovalLights(), []);
  return (
    <Link
      href={href}
      aria-label={`${logoAlt}, home`}
      className="absolute left-1/2 top-[calc(var(--g)*0.5)] z-20 block h-[var(--logo-h)] w-[var(--logo-w)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] outline-none focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1a14]"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[50%] border border-[#e9d7b0]/40 bg-[#07110d]/65 shadow-[0_12px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md"
      />
      {/* The light string's wire, just outside the frame. */}
      <span aria-hidden className="absolute -inset-[5px] rounded-[50%] border border-[#cdb27a]/25" />
      <span aria-hidden className="gh-glow-soft absolute -inset-[5px] [--gh-core:3px] [--gh-halo:14px] md:[--gh-core:3.4px] md:[--gh-halo:17px]">
        {lights.map((l, i) => (
          <FairyLight key={i} light={l} />
        ))}
      </span>
      <span className="relative flex h-full w-full items-center justify-center px-[16%] py-[14%]">
        {logo ?? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt={logoAlt} className="max-h-full max-w-full object-contain" draggable={false} />
        )}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------

/** Frost crystals that grow in from the rim of a glass plate. */
export function Frost({ seed, blooming }: { seed: number; blooming: boolean }) {
  const strokes = useMemo(() => frostStrokes(seed), [seed]);
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={cn("gh-frost pointer-events-none absolute inset-0 h-full w-full", blooming && "is-blooming")}
    >
      {strokes.map((s, i) => (
        <path key={i} d={s.d} pathLength={1} strokeWidth={s.width} style={{ "--fd": `${s.delay}s` } as CSSProperties} />
      ))}
    </svg>
  );
}

/** A few soft, out-of-focus lights far behind the garland, for depth. */
export function Bokeh() {
  const dots = [
    { x: 6, y: 62, s: 46, o: 0.1 },
    { x: 18, y: 30, s: 22, o: 0.12 },
    { x: 29, y: 78, s: 34, o: 0.07 },
    { x: 43, y: 55, s: 18, o: 0.1 },
    { x: 57, y: 82, s: 40, o: 0.06 },
    { x: 68, y: 40, s: 26, o: 0.1 },
    { x: 80, y: 70, s: 52, o: 0.08 },
    { x: 93, y: 35, s: 24, o: 0.11 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE7CC] blur-md"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.s, height: d.s, opacity: d.o }}
        />
      ))}
    </div>
  );
}
