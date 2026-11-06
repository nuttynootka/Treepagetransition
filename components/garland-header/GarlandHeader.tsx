"use client";

import { forwardRef, useMemo, useRef, type AnchorHTMLAttributes } from "react";
import { placeTabs } from "./geometry";
import { useReducedMotion, useWarmPointer } from "./hooks";
import { Bokeh, cn, Garland, LogoFrame } from "./parts";
import { SnowflakeTab } from "./SnowflakeTab";
import type { CrystalImage, GarlandPage, LinkLike } from "./types";
import "./garland-header.css";

export interface GarlandHeaderProps {
  /** One snowflake per page, left to right. Half hang left of the logo, half right. */
  pages: GarlandPage[];
  /** The current path, e.g. from Next's usePathname(). Its snowflake lights up. */
  activeHref: string;
  /** Your garland photo: a wide image with a transparent background. */
  garlandSrc?: string;
  /** "cover" stretches one photo across the width. "repeat" tiles it sideways (needs a seamless photo). */
  garlandFit?: "cover" | "repeat";
  /** Your logo file. Ignored if you pass `logo`. */
  logoSrc?: string;
  /** Describes the logo for screen readers, e.g. your company name. */
  logoAlt?: string;
  /** Any element to use as the logo instead of an image file (for example an inline SVG). */
  logo?: React.ReactNode;
  /** Where the logo links to. */
  homeHref?: string;
  /**
   * Crystal snowflake pictures, used in turn for each page (page 1 gets the first, and so on,
   * starting again after the last).
   */
  crystals?: CrystalImage[];
  /** The link component to use, e.g. next/link or TransitionLink. Defaults to a plain <a>. */
  LinkComponent?: LinkLike;
  className?: string;
}

export const DEFAULT_CRYSTALS: CrystalImage[] = [
  { src: "/snowflakes/crystal-1.webp", plate: 0.3516 },
  { src: "/snowflakes/crystal-2.webp", plate: 0.3603 },
  { src: "/snowflakes/crystal-3.webp", plate: 0.3749 },
  { src: "/snowflakes/crystal-4.webp", plate: 0.3682 },
];

const PlainLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function PlainLink(props, ref) {
    return <a ref={ref} {...props} />;
  },
);

function isActive(activeHref: string, href: string) {
  if (href === "/") return activeHref === "/";
  return activeHref === href || activeHref.startsWith(`${href}/`);
}

export function GarlandHeader({
  pages,
  activeHref,
  garlandSrc = "/garland/garland.png",
  garlandFit = "cover",
  logoSrc = "/brand/logo.svg",
  logoAlt = "Company logo",
  logo,
  homeHref = "/",
  crystals = DEFAULT_CRYSTALS,
  LinkComponent = PlainLink,
  className,
}: GarlandHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const layout = useMemo(() => placeTabs(pages.length), [pages.length]);
  // Longest label sets one shared label size, so every plate reads alike.
  const longest = Math.max(1, ...pages.map((p) => p.label.length));

  useWarmPointer(rootRef, true);

  return (
    <header
      ref={rootRef}
      className={cn(
        "gh-root relative isolate w-full select-none overflow-hidden text-[#FFF8F0]",
        // Sizes per screen width: garland height, snowflake size, logo frame.
        "[--g:76px] sm:[--g:88px] md:[--g:100px] lg:[--g:116px]",
        "[--flake:min(150px,31vw)] sm:[--flake:160px] md:[--flake:172px] lg:[--flake:150px] xl:[--flake:196px]",
        // Glass plate width as a share of the snowflake (bigger on phones, for the label).
        "[--plate:0.58] sm:[--plate:0.5] lg:[--plate:0.46] xl:[--plate:0.42]",
        "[--logo-w:136px] [--logo-h:66px] sm:[--logo-w:168px] sm:[--logo-h:80px] md:[--logo-w:204px] md:[--logo-h:94px] lg:[--logo-w:236px] lg:[--logo-h:108px]",
        "h-[calc(var(--g)+var(--rib-n)+var(--flake)+30px)] lg:h-[calc(var(--g)+var(--rib-w)+var(--flake)+36px)]",
        className,
      )}
      style={{ "--rib-n": layout.maxNarrow, "--rib-w": layout.maxWide } as React.CSSProperties}
    >
      {/* Night backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(130%_90%_at_50%_-10%,#173a2b_0%,#0b1a14_45%,#060c0a_100%)]"
      />
      <Bokeh />

      <LogoFrame href={homeHref} logo={logo} logoSrc={logoSrc} logoAlt={logoAlt} Link={LinkComponent} />

      <nav aria-label="Main">
        <ul className="m-0 list-none p-0">
          {pages.map((page, i) => (
            <SnowflakeTab
              key={page.href}
              page={page}
              active={isActive(activeHref, page.href)}
              placement={layout.tabs[i]}
              crystal={crystals[i % crystals.length]}
              mirrored={Math.floor(i / crystals.length) % 2 === 1}
              labelChars={longest}
              motion={!reducedMotion}
              Link={LinkComponent}
            />
          ))}
        </ul>
      </nav>

      <Garland src={garlandSrc} fit={garlandFit} />
    </header>
  );
}
