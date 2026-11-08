"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState, type AnchorHTMLAttributes } from "react";
import { placeTabs } from "./geometry";
import { useReducedMotion, useWarmPointer } from "./hooks";
import { NOBLE_STAR_LOGO, type LogoStar } from "./noble-star-logo";
import { Bokeh, cn, Garland, LogoSign } from "./parts";
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
  /**
   * Optional photo of a garland (wide, transparent background) to use instead of the
   * painted noble fir and western red cedar garland.
   */
  garlandSrc?: string;
  /** "cover" stretches one photo across the width. "repeat" tiles it sideways (needs a seamless photo). */
  garlandFit?: "cover" | "repeat";
  /** Your logo file. Ignored if you pass `logo`. */
  logoSrc?: string;
  /** The logo's width divided by its height. */
  logoRatio?: number;
  /** Where the logo's star is, so it can glow and twinkle. Leave out for no star effect. */
  logoStar?: LogoStar;
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
  // 8-point stars in 14K unplated palladium white gold with a glass-bead blasted (satin)
  // finish, made by scripts/make-gold-stars.py. `plate` is unused for sizing.
  { src: "/stars/white-gold-star-1.webp", plate: 0.1 },
  { src: "/stars/white-gold-star-2.webp", plate: 0.1 },
  { src: "/stars/white-gold-star-3.webp", plate: 0.1 },
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
  garlandSrc,
  garlandFit = "cover",
  logoSrc = NOBLE_STAR_LOGO.src,
  logoRatio = NOBLE_STAR_LOGO.ratio,
  logoStar = logoSrc === NOBLE_STAR_LOGO.src ? NOBLE_STAR_LOGO.star : undefined,
  logoAlt = "Noble Star Forest",
  logo,
  homeHref = "/",
  crystals = DEFAULT_CRYSTALS,
  LinkComponent = PlainLink,
  className,
}: GarlandHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const layout = useMemo(() => placeTabs(pages.length), [pages.length]);
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
        // Garland thickness per screen width. The sign is twice as tall (--sign-h), starts
        // 4px from the top, and the garland runs behind its middle (--gt = garland top).
        "[--g:58px] sm:[--g:66px] md:[--g:76px] lg:[--g:84px] xl:[--g:92px]",
        "[--sign-top:4px] [--sign-h:calc(var(--g)*2)] [--gt:calc(var(--sign-top)+var(--g)/2)]",
        "[--flake:min(80px,22vw)] sm:[--flake:96px] md:[--flake:124px] lg:[--flake:164px] xl:[--flake:180px]",
        // One text size for every menu word (snowflakes and hanging plates alike).
        "[--label-size:10.5px] md:[--label-size:11.5px] lg:[--label-size:12px]",
        // Hanging menu plates.
        "[--menu-h:26px] [--menu-font:var(--label-size)] md:[--menu-h:28px]",
        "h-[calc(var(--gt)+var(--g)+var(--rib-n)+var(--flake)+30px)] lg:h-[calc(var(--gt)+var(--g)+var(--rib-w)+var(--flake)+36px)]",
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

      <LogoSign
        href={homeHref}
        logo={logo}
        logoSrc={logoSrc}
        logoAlt={logoAlt}
        ratio={logoRatio}
        star={logoStar}
        Link={LinkComponent}
      />

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
