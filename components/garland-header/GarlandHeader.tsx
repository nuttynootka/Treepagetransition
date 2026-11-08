"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState, type AnchorHTMLAttributes } from "react";
import { placeTabs } from "./geometry";
import { useReducedMotion, useWarmPointer } from "./hooks";
import { NOBLE_STAR_LOGO, type LogoStar } from "./noble-star-logo";
import { Bokeh, cn, Garland, LogoSign } from "./parts";
import { HangingMenu } from "./HangingMenu";
import { PlateTab } from "./PlateTab";
import { useTabSwap } from "./tab-swap";
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
  /**
   * What the tabs look like: "star" (crystal stars) or "plate" (frosted glass plates, the
   * same as the menu plates, hanging on chains, with the menu unrolling from under them).
   */
  tabStyle?: "star" | "plate";
  /** The link component to use, e.g. next/link or TransitionLink. Defaults to a plain <a>. */
  LinkComponent?: LinkLike;
  className?: string;
}

export const DEFAULT_CRYSTALS: CrystalImage[] = [
  // Faceted 8-point crystal stars (made by scripts/make-crystal-stars.py). They have no
  // opening in the middle, so `plate` is only a small minimum size for the glass centre.
  { src: "/stars/crystal-star-1.webp", plate: 0.1 },
  { src: "/stars/crystal-star-2.webp", plate: 0.1 },
  { src: "/stars/crystal-star-3.webp", plate: 0.1 },
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
  tabStyle = "star",
  LinkComponent = PlainLink,
  className,
}: GarlandHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const plates = tabStyle === "plate";
  const layout = useMemo(() => placeTabs(pages.length, plates), [pages.length, plates]);
  const idBase = useId();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Plate tabs: three fixed slots whose labels swap (see tab-swap.ts). Needs exactly three pages.
  const swapEnabled = plates && pages.length === 3;
  const viewed = pages.findIndex((p) => isActive(activeHref, p));
  const swap = useTabSwap({
    count: pages.length,
    viewed: viewed >= 0 ? viewed : null,
    hasMenu: pages.map((p) => !!p.items),
    activate: (h) => rootRef.current?.querySelector<HTMLAnchorElement>(`[data-go="${h}"] a`)?.click(),
    enabled: swapEnabled,
  });
  const swapOpenRef = useRef<number | null>(null);
  swapOpenRef.current = swap.openIdx;

  useWarmPointer(rootRef, true);

  // A new page: roll every menu up.
  useEffect(() => setOpenMenu(null), [activeHref]);

  // Plate tabs: tapping anywhere outside the tabs and the dropdown, or pressing Escape, closes
  // the dropdown and fades the labels back to how they were.
  useEffect(() => {
    if (!swapEnabled || swap.openIdx === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-tab]")) swap.closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") swap.closeAll();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapEnabled, swap.openIdx]);

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
        // The sign's height (--sign-h) per screen width. It starts 4px from the top. The garland
        // is 25% thinner than half the sign (--g) and runs behind the sign's middle (--gt = top).
        "[--sign-h:116px] sm:[--sign-h:132px] md:[--sign-h:152px] lg:[--sign-h:168px] xl:[--sign-h:184px]",
        "[--g:calc(var(--sign-h)*0.375)] [--sign-top:4px] [--gt:calc(var(--sign-top)+var(--sign-h)/2-var(--g)/2)]",
        "[--flake:min(94px,26vw)] sm:[--flake:110px] md:[--flake:134px] lg:[--flake:164px] xl:[--flake:180px]",
        // One text size for every menu word (snowflakes and hanging plates alike).
        "[--label-size:12px] md:[--label-size:13px] lg:[--label-size:14px]",
        // Hanging menu plates.
        "[--menu-h:26px] [--menu-font:var(--label-size)] md:[--menu-h:28px]",
        // The tab's height: a star is --flake tall; a plate is --menu-h (less a little, as it needs less room below).
        plates ? "[--tab-h:calc(var(--menu-h)-18px)]" : "[--tab-h:var(--flake)]",
        "h-[calc(var(--gt)+var(--g)+var(--rib-n)+var(--tab-h)+30px)] lg:h-[calc(var(--gt)+var(--g)+var(--rib-w)+var(--tab-h)+36px)]",
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

      {/* Pages with no dropdown (Home) are reached by pressing one of these out-of-sight links,
          so the page change uses your link component (and so its page transition). */}
      {swapEnabled &&
        pages.map(
          (p, h) =>
            !p.items && (
              <span key={p.label} data-go={h} inert className="sr-only">
                <LinkComponent href={p.href ?? "/"}>{p.label}</LinkComponent>
              </span>
            ),
        )}

      <nav aria-label="Main">
        <ul className="m-0 list-none p-0">
          {swapEnabled
            ? [0, 1, 2].map((pos) => {
                const h = swap.display[pos];
                const page = pages[h];
                return (
                  <PlateTab
                    key={pos}
                    pos={pos}
                    label={page.label}
                    sizerLabels={pages.map((p) => p.label)}
                    fading={swap.fading[pos]}
                    current={pos === 1}
                    expanded={page.items ? swap.openIdx === h : undefined}
                    controls={page.items ? `${idBase}-menu-${h}` : undefined}
                    onPress={() => swap.tap(pos)}
                    placement={layout.tabs[pos]}
                    motion={!reducedMotion}
                  >
                    {/* Every dropdown unrolls from the centre tab, whichever page is in it. */}
                    {pos === 1 &&
                      pages.map(
                        (p, hi) =>
                          p.items && (
                            <HangingMenu
                              key={p.label}
                              id={`${idBase}-menu-${hi}`}
                              label={p.label}
                              items={p.items}
                              open={swap.openIdx === hi}
                              activeHref={activeHref}
                              Link={LinkComponent}
                              onSelect={swap.select}
                              fromTab
                            />
                          ),
                      )}
                  </PlateTab>
                );
              })
            : pages.map((page, i) => {
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
