"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, type AnchorHTMLAttributes } from "react";
import { placeTabs } from "./geometry";
import { useReducedMotion, useWarmPointer } from "./hooks";
import { NOBLE_STAR_LOGO, type LogoStar } from "./noble-star-logo";
import { Bokeh, cn, Garland, LogoSign } from "./parts";
import { HangingMenu } from "./HangingMenu";
import { PlateTab } from "./PlateTab";
import { useTabSwap } from "./tab-swap";
import type { GarlandPage, LinkLike } from "./types";
import "./garland-header.css";

export interface GarlandHeaderProps {
  /**
   * Exactly three entries, in the order the tabs first appear left to right (for example
   * Shop, Home, Us). An entry with `items` opens a hanging menu of glass plates; an entry
   * with `href` goes straight to that page.
   */
  pages: GarlandPage[];
  /** The current path, e.g. from Next's usePathname(). Its entry is shown in the centre tab. */
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
  /** The link component to use, e.g. next/link or TransitionLink. Defaults to a plain <a>. */
  LinkComponent?: LinkLike;
  className?: string;
}

const PlainLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function PlainLink(props, ref) {
    return <a ref={ref} {...props} />;
  },
);

function matches(activeHref: string, href: string) {
  if (href === "/") return activeHref === "/";
  return activeHref === href || activeHref.startsWith(`${href}/`);
}

/** A tab's page is being viewed when you're on its page, or on any page in its menu. */
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
  LinkComponent = PlainLink,
  className,
}: GarlandHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const layout = useMemo(() => placeTabs(), []);
  const idBase = useId();

  // Three fixed slots whose labels swap (see tab-swap.ts).
  const viewed = pages.findIndex((p) => isActive(activeHref, p));
  const swap = useTabSwap({
    count: pages.length,
    viewed: viewed >= 0 ? viewed : null,
    hasMenu: pages.map((p) => !!p.items),
    activate: (h) => rootRef.current?.querySelector<HTMLAnchorElement>(`[data-go="${h}"] a`)?.click(),
    enabled: true,
  });

  useWarmPointer(rootRef, true);

  // Tapping anywhere outside the tabs and the dropdown, or pressing Escape, closes the
  // dropdown and fades the labels back to how they were.
  useEffect(() => {
    if (swap.openIdx === null) return;
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
  }, [swap.openIdx]);

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
        // One text size for every menu word (tabs and hanging plates alike).
        "[--label-size:12px] md:[--label-size:13px] lg:[--label-size:14px]",
        // Hanging menu plates.
        "[--menu-h:26px] [--menu-font:var(--label-size)] md:[--menu-h:28px]",
        // A tab plate needs a little less room below than its own height.
        "[--tab-h:calc(var(--menu-h)-18px)]",
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
      {pages.map(
          (p, h) =>
            !p.items && (
              <span key={p.label} data-go={h} inert className="sr-only">
                <LinkComponent href={p.href ?? "/"}>{p.label}</LinkComponent>
              </span>
            ),
      )}

      <nav aria-label="Main">
        <ul className="m-0 list-none p-0">
          {[0, 1, 2].map((pos) => {
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
                            />
                          ),
                      )}
                  </PlateTab>
                );
              })}
        </ul>
      </nav>

      <Garland src={garlandSrc} fit={garlandFit} />
    </header>
  );
}
