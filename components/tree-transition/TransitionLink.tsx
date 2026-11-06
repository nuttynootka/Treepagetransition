"use client";

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useRef, type ComponentProps, type MouseEvent } from "react";
import { useTreeTransition } from "./TreeTransitionProvider";
import type { TransitionOrigin } from "./engine";

type LinkProps = ComponentProps<typeof Link>;

/** Turn Link's href (string or URL object) into a string. */
function hrefToString(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "";
  let query = "";
  if (typeof href.query === "string") query = href.query;
  else if (href.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(href.query)) {
      if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
      else if (v != null) params.append(k, String(v));
    }
    query = params.toString();
  }
  const hash = href.hash ? (href.hash.startsWith("#") ? href.hash : `#${href.hash}`) : "";
  return `${path}${query ? `?${query.replace(/^\?/, "")}` : ""}${hash}`;
}

/** Only same-site links in the same tab get the transition. */
function isInternal(el: HTMLAnchorElement): boolean {
  if (el.target && el.target !== "_self") return false;
  if (el.hasAttribute("download")) return false;
  return el.origin === window.location.origin;
}

/**
 * Drop-in replacement for next/link's <Link>. Same props.
 *
 * - Mouse / keyboard: Link's own `onNavigate` is cancelled, and the tree plays first.
 * - Touch: a passive touchend listener starts the tree the instant a finger lifts
 *   from a tap (not a scroll), without waiting for the browser's click event.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(function TransitionLink(
  { href, onNavigate, onClick, replace, scroll, ...rest },
  forwardedRef,
) {
  const { navigate } = useTreeTransition();
  const hrefString = hrefToString(href);
  const elRef = useRef<HTMLAnchorElement | null>(null);
  const originRef = useRef<TransitionOrigin | null>(null);
  const startedByTouchRef = useRef(false);

  const setRefs = useCallback(
    (node: HTMLAnchorElement | null) => {
      elRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  // Passive touch listeners: never block scrolling, and fire on tap release.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let tap: { x: number; y: number; time: number; moved: boolean } | null = null;
    let resetTimer = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tap = null;
        return;
      }
      const t = e.touches[0];
      tap = { x: t.clientX, y: t.clientY, time: performance.now(), moved: false };
    };
    const onMove = (e: TouchEvent) => {
      if (!tap) return;
      const t = e.touches[0];
      if (Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 10) tap.moved = true;
    };
    const onEnd = () => {
      const current = tap;
      tap = null;
      if (!current || current.moved || performance.now() - current.time > 600) return;
      if (!isInternal(el)) return;
      startedByTouchRef.current = true;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => (startedByTouchRef.current = false), 1000);
      navigate(hrefString, { origin: { x: current.x, y: current.y }, replace, scroll: scroll ?? undefined });
    };
    const onCancel = () => (tap = null);

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      window.clearTimeout(resetTimer);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [hrefString, navigate, replace, scroll]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    // Keyboard "clicks" report 0,0, so use the middle of the link instead.
    if (e.detail === 0 || (e.clientX === 0 && e.clientY === 0)) {
      const r = e.currentTarget.getBoundingClientRect();
      originRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } else {
      originRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  return (
    <Link
      {...rest}
      ref={setRefs}
      href={href}
      replace={replace}
      scroll={scroll}
      onClick={handleClick}
      onNavigate={(e) => {
        onNavigate?.(e);
        // Always stop Link's own navigation; the provider navigates after the star.
        e.preventDefault();
        if (startedByTouchRef.current) return; // a tap already started it
        navigate(hrefString, { origin: originRef.current, replace, scroll: scroll ?? undefined });
      }}
    />
  );
});
