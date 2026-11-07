"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { paintGarland } from "./garland-painter";
import { garlandLights, ovalLights, seededRandom, type LightPoint } from "./geometry";
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
  /** Optional photo of a garland to use instead of the painted one. */
  src?: string;
  fit: "cover" | "repeat";
}

/**
 * The garland across the top, between y = --gt and --gt + --g: painted noble fir
 * and western red cedar (or your own photo), with two light strands woven over it.
 */
export function Garland({ src, fit }: GarlandProps) {
  const status = useImageStatus(src);
  const usePhoto = !!src && status !== "missing";
  // Painted garland: lights are placed on the painted foliage once it's drawn.
  // Photo garland: two strands woven through the middle.
  const strands = useMemo(() => garlandLights(), []);
  const [painted, setPainted] = useState<LightPoint[] | null>(null);
  const lights = usePhoto ? strands : painted ?? [];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[var(--gt)] z-10 h-[var(--g)]">
      {usePhoto ? (
        fit === "repeat" ? (
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
        )
      ) : (
        <PaintedGarland onLights={setPainted} />
      )}
      <div className="gh-glow-soft absolute inset-0 [--gh-core:2.2px] [--gh-halo:9px] md:[--gh-core:2.7px] md:[--gh-halo:11px]">
        {lights.map((l, i) => (
          <FairyLight key={i} light={l} className={l.dense ? "hidden sm:block" : undefined} />
        ))}
      </div>
    </div>
  );
}

/** Canvas the painter draws on; repainted when the header changes size. */
function PaintedGarland({ onLights }: { onLights: (lights: LightPoint[]) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let last = "";
    const paint = () => {
      frame = 0;
      const band = canvas.parentElement!;
      const width = band.clientWidth;
      const thickness = band.clientHeight;
      const height = Math.round(thickness * 1.8);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const key = `${width}x${thickness}@${dpr}`;
      if (!width || !thickness || key === last) return;
      last = key;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintGarland(ctx, width, height, thickness);
      onLights(lightsOnFoliage(ctx, canvas.width, canvas.height, width));
    };
    paint();
    const ro = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(paint);
    });
    ro.observe(canvas.parentElement!);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {/* Shows at once, before the canvas paints: a dark evergreen band. */}
      <div className="absolute inset-x-0 top-[12%] h-[76%] rounded-full bg-[#0f2a1f] blur-md" />
      <canvas
        ref={ref}
        className="absolute inset-x-0 -top-[40%] h-[180%] w-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.6)]"
      />
    </>
  );
}

/**
 * Fairy lights spread through the whole garland, top sprigs to drooping cedar,
 * edge to edge. The width is split into columns (about one light per 8px), and
 * each column's light goes at a random height where the painted canvas actually
 * has foliage, so no light floats in a gap. Positions are percent of the garland
 * band, so they can sit above (negative) or below (over 100%) it.
 */
function lightsOnFoliage(ctx: CanvasRenderingContext2D, pxW: number, pxH: number, width: number): LightPoint[] {
  const data = ctx.getImageData(0, 0, pxW, pxH).data;
  const rand = seededRandom(97);
  const count = Math.max(16, Math.round(width / 8));
  const canvasTop = -0.4; // canvas starts 40% of a band above the band
  const canvasSpan = 1.8; // and is 1.8 bands tall
  const out: LightPoint[] = [];
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 14; attempt++) {
      const fx = (i + 0.15 + rand() * 0.7) / count;
      // Mostly within the garland's body, sometimes out in the top sprigs or hanging cedar.
      const fy = 0.1 + Math.pow(rand(), 0.9) * 0.8;
      const px = Math.min(pxW - 1, Math.floor(fx * pxW));
      const py = Math.min(pxH - 1, Math.floor(fy * pxH));
      if (data[(py * pxW + px) * 4 + 3] < 200) continue;
      const dur = 1.5 + rand() * 1.5;
      out.push({
        x: Math.round(fx * 10000) / 100,
        y: Math.round((canvasTop + fy * canvasSpan) * 10000) / 100,
        dur: Math.round(dur * 100) / 100,
        delay: Math.round(-rand() * dur * 100) / 100,
      });
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

interface LogoSignProps {
  href: string;
  logo?: ReactNode;
  logoSrc: string;
  logoAlt: string;
  /** Width / height of the logo image. */
  ratio: number;
  /** Points (percent of the logo box) for the light string; an oval if not given. */
  outline?: [number, number][];
  Link: LinkLike;
}

/**
 * The logo, centred on the page and on the garland, twice as tall as the garland
 * is thick, with its own always-on string of fairy lights around its edge.
 */
export function LogoSign({ href, logo, logoSrc, logoAlt, ratio, outline, Link }: LogoSignProps) {
  const lights = useMemo<LightPoint[]>(() => {
    if (!outline) return ovalLights();
    const rand = seededRandom(31);
    return outline.map(([x, y]) => {
      const dur = 1.5 + rand() * 1.5;
      return { x, y, dur: Math.round(dur * 100) / 100, delay: Math.round(-rand() * dur * 100) / 100 };
    });
  }, [outline]);
  return (
    <Link
      href={href}
      aria-label={`${logoAlt}, home`}
      className="absolute left-1/2 top-[var(--sign-top)] z-20 block h-[var(--sign-h)] -translate-x-1/2 outline-none focus-visible:ring-2 focus-visible:ring-[#FFF5EB]/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1a14]"
    >
      <span className="relative block h-full" style={{ aspectRatio: String(ratio) }}>
        {logo ?? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={logoAlt}
            draggable={false}
            className="block h-full w-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.65)]"
          />
        )}
        <span aria-hidden className="gh-glow-soft pointer-events-none absolute inset-0 [--gh-core:2.2px] [--gh-halo:9px] md:[--gh-core:2.7px] md:[--gh-halo:11px]">
          {lights.map((l, i) => (
            <FairyLight key={i} light={l} />
          ))}
        </span>
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------

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
