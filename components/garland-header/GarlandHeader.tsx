"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState, type AnchorHTMLAttributes } from "react";
import { placeTabs } from "./geometry";
import { useReducedMotion, useWarmPointer } from "./hooks";
import { Bokeh, cn, Garland, LogoFrame } from "./parts";
import { HangingMenu } from "./HangingMenu";
import { SnowflakeTab } from "./SnowflakeTab";
import type { CrystalImage, GarlandPage, LinkLike } from "./types";
import "./garland-header.css";

export interface GarlandHeaderProps {
  /**
   * One snowflake per entry, left to right. An entry with `items` opens a hanging menu
   * of glass plates instead of linking to a page.
   */
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

function matches(activeHref: string, href: string) {
  if (href === "/") return activeHref === "/";
  return activeHref === href || activeHref.startsWith(`${href}/`);
}

/** A snowflake is lit when you're on its page, or on any page in its menu. */
function isActive(activeHref: string, page: GarlandPage) {
  if (page.items) return page.items.some((item) => matches(activeHref, item.href));
  return page.href ? matches(activeHref, page.href) : false;
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
  const idBase = useId();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useWarmPointer(rootRef, true);

  // A new page: roll every menu up.
  useEffect(() => setOpenMenu(null), [activeHref]);

  // Tapping anywhere else, or pressing Escape, rolls the open menu up.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = (e.target as Element | null)?.closest?.("[data-menu-root]");
      if (root?.getAttribute("data-menu-root") !== openMenu) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const button = document.querySelector<HTMLButtonElement>(`[aria-controls="${CSS.escape(openMenu)}"]`);
      setOpenMenu(null);
      button?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  return (
    <header
      ref={rootRef}
      className={cn(
        // overflow-x-clip (not hidden) so the hanging menus can drop below the header.
        "gh-root @container relative isolate z-30 w-full select-none overflow-x-clip text-[#FFF8F0]",
        // Sizes per screen width: garland height, snowflake size, logo frame.
        "[--g:76px] sm:[--g:88px] md:[--g:100px] lg:[--g:116px]",
        "[--flake:min(86px,24vw)] sm:[--flake:98px] md:[--flake:110px] lg:[--flake:117px] xl:[--flake:127px]",
        // Glass plate width as a share of the snowflake: just big enough for the longest label.
        "[--plate:0.67] sm:[--plate:0.6] md:[--plate:0.56] lg:[--plate:0.55] xl:[--plate:0.54]",
        "[--logo-w:136px] [--logo-h:66px] sm:[--logo-w:168px] sm:[--logo-h:80px] md:[--logo-w:204px] md:[--logo-h:94px] lg:[--logo-w:236px] lg:[--logo-h:108px]",
        // Hanging menu plates.
        "[--menu-h:26px] [--menu-font:10.5px] md:[--menu-h:28px] md:[--menu-font:11.5px]",
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
          {pages.map((page, i) => {
            const menuId = `${idBase}-menu-${i}`;
            const open = openMenu === menuId;
            return (
              <SnowflakeTab
                key={page.href ?? page.label}
                page={page}
                active={isActive(activeHref, page)}
                placement={layout.tabs[i]}
                crystal={crystals[i % crystals.length]}
                mirrored={Math.floor(i / crystals.length) % 2 === 1}
                labelChars={longest}
                motion={!reducedMotion}
                Link={LinkComponent}
                menu={page.items ? { id: menuId, open, onToggle: () => setOpenMenu(open ? null : menuId) } : undefined}
              >
                {page.items && (
                  <HangingMenu
                    id={menuId}
                    label={page.label}
                    items={page.items}
                    open={open}
                    activeHref={activeHref}
                    Link={LinkComponent}
                    onSelect={() => setOpenMenu(null)}
                  />
                )}
              </SnowflakeTab>
            );
          })}
        </ul>
      </nav>

      <Garland src={garlandSrc} fit={garlandFit} />
    </header>
  );
}
