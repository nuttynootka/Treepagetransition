"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { GLINT_COLORS, hashString, STAR_CENTRE_Y, starGlints, type Glint, type TabPlacement } from "./geometry";
import { useSwing } from "./hooks";
import { cn } from "./parts";
import type { CrystalImage, GarlandPage, LinkLike } from "./types";

/**
 * Half the width of the frosted fade behind a word. Before the browser measures the
 * word, this estimates it: capitals in this serif with 0.04em spacing are about 0.72em
 * each. Every label uses the same font size (--label-size).
 */
export function estimatePlate(label: string): string {
  return `calc(var(--label-size) * ${(label.length * 0.36 + 0.8).toFixed(2)})`;
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
  motion,
  Link,
  menu,
  children,
}: SnowflakeTabProps) {
  const seed = useMemo(() => hashString((page.href ?? "") + page.label), [page.href, page.label]);
  const glints = useMemo(() => starGlints(seed, 12), [seed]);
  // Each crystal turns on its ribbon at its own pace (3.6–5.2s each way).
  const turnStyle = useMemo(() => {
    const dur = 3.6 + (seed % 1000) / 625;
    return { "--turn-dur": `${dur.toFixed(2)}s`, "--turn-delay": `${(-((seed >> 10) % 1000) / 100).toFixed(2)}s` } as CSSProperties;
  }, [seed]);
  const { ref: swingRef, kick } = useSwing<HTMLDivElement>(motion);

  // Size the frosted fade behind the word to the word itself. Re-measured when the font
  // loads or the size changes.
  const turnRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const label = labelRef.current;
    const turn = turnRef.current;
    if (!label || !turn) return;
    const fit = () => {
      const fontPx = parseFloat(getComputedStyle(label).fontSize) || 12;
      turn.style.setProperty("--fade-w", `${(label.offsetWidth / 2 + fontPx * 0.8).toFixed(1)}px`);
      turn.style.setProperty("--fade-h", `${(fontPx * 1.35).toFixed(1)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(label);
    return () => ro.disconnect();
  }, [page.label]);

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
          <span
            ref={turnRef}
            className="gh-turn pointer-events-none absolute inset-0 origin-[50%_40%]"
            style={{ ...turnStyle, "--fade-w": estimatePlate(page.label), "--fade-h": "calc(var(--label-size) * 1.35)", "--star-cy": `${STAR_CENTRE_Y * 100}%` } as CSSProperties}
          >
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
              {/* Behind the word, the facets fade to soft frosted crystal so the word stays
                  legible. Masked to the star, so a long word runs on into the points. */}
              <span
                aria-hidden
                className={cn("gh-text-fade absolute inset-0", active && "is-active")}
                style={{ maskImage: `url("${crystal.src}")`, WebkitMaskImage: `url("${crystal.src}")` }}
              />
            </span>

            {/* Glints of light caught in the facets */}
            <span aria-hidden className="gh-glints absolute inset-0">
              {glints.map((g, i) => (
                <GlintSpark key={i} glint={g} />
              ))}
            </span>

            {/* The word, etched dark straight onto the star, centred where the points meet. */}
            <span
              ref={labelRef}
              className={cn(
                "gh-title gh-etched absolute left-1/2 top-[var(--star-cy)] -mr-[0.04em] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-semibold uppercase leading-none tracking-[0.06em]",
                "font-[family-name:var(--gh-font)] text-[length:var(--label-size)]",
                active && "is-blooming",
              )}
            >
              {page.label}
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
