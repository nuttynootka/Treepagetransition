"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The tab-swap behaviour for the three plate tabs.
 *
 * The tabs sit in fixed left / centre / right slots. Only their labels move. The centre
 * slot always shows the page being viewed. "Headers" are the entries of the `pages` list,
 * numbered by their index; an "arrangement" is the list of which header is in the left,
 * centre and right slot, such as [0, 1, 2].
 *
 * Three things are kept:
 *  - `base`: the arrangement that matches the page being viewed (centre = that page).
 *    Every swap is worked out from this, never from what is currently on screen, so
 *    tapping Shop and then Us undoes Shop's swap first.
 *  - `display`: the arrangement currently shown. It is only ever replaced by whole
 *    arrangements (each a permutation of the headers), so two slots can never show the
 *    same label, however fast someone taps.
 *  - `openIdx`: the header whose dropdown is open in the centre, if any.
 *
 * To change the arrangement, the labels that differ fade out (FADE_MS), the arrangement
 * is replaced while they are invisible, and they fade back in (FADE_MS). A dropdown opens
 * only after that. A new tap cancels whatever is in progress and starts again from `base`.
 */

export const FADE_MS = 150;
/** Wait a little longer than the CSS fade, so the label is fully clear before it changes. */
const FADE_WAIT = FADE_MS + 10;
/** How long a closing dropdown takes to roll up before another may open in the same place. */
const ROLL_UP_MS = 750;

/** The arrangement with header `h` moved into the centre slot (swapping with whoever is there). */
export function swapToCenter(arr: number[], h: number): number[] {
  const a = [...arr];
  const p = a.indexOf(h);
  if (p >= 0 && p !== 1) [a[1], a[p]] = [a[p], a[1]];
  return a;
}

interface Options {
  /** Number of headers. The behaviour needs exactly three. */
  count: number;
  /** Index of the header for the page being viewed, or null if none matches. */
  viewed: number | null;
  /** Which headers have a dropdown. */
  hasMenu: boolean[];
  /** Go to a header's own page (for a header with no dropdown, such as Home). */
  activate: (header: number) => void;
  enabled: boolean;
}

export function useTabSwap({ count, viewed, hasMenu, activate, enabled }: Options) {
  const identity = Array.from({ length: count }, (_, i) => i);
  const [initial] = useState(() => (viewed != null ? swapToCenter(identity, viewed) : identity));

  const [display, setDisplayState] = useState<number[]>(initial);
  const [fading, setFadingState] = useState<boolean[]>(() => identity.map(() => false));
  const [openIdx, setOpenState] = useState<number | null>(null);

  const baseRef = useRef<number[]>(initial);
  const dispRef = useRef<number[]>(initial);
  const fadeRef = useRef<boolean[]>(identity.map(() => false));
  const openRef = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const activateRef = useRef(activate);
  activateRef.current = activate;
  const hasMenuRef = useRef(hasMenu);
  hasMenuRef.current = hasMenu;

  const setDisplay = (a: number[]) => {
    dispRef.current = a;
    setDisplayState(a);
  };
  const setFading = (f: boolean[]) => {
    fadeRef.current = f;
    setFadingState(f);
  };
  const setOpen = (h: number | null) => {
    openRef.current = h;
    setOpenState(h);
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  /**
   * Get to `target`, then open `openAfter` (if any). `closeNow` rolls up any open dropdown
   * straight away. `then` runs once the labels have faded back in.
   */
  const transitionTo = useCallback((target: number[], openAfter: number | null, closeNow: boolean, then?: () => void) => {
    clearTimers();
    const prevOpen = openRef.current;
    if (closeNow) setOpen(null);
    // Another dropdown was open: let it roll up before the next one opens in the same place.
    const rollUp = closeNow && prevOpen !== null && prevOpen !== openAfter ? ROLL_UP_MS : 0;

    const cur = dispRef.current;
    const fadeSet = cur.map((h, p) => h !== target[p] || fadeRef.current[p]);
    if (!fadeSet.some(Boolean)) {
      if (openAfter !== null) {
        if (rollUp) later(() => setOpen(openAfter), rollUp);
        else setOpen(openAfter);
      }
      if (then) then();
      return;
    }

    setFading(fadeSet);
    later(() => {
      setDisplay(target);
      setFading(target.map(() => false));
    }, FADE_WAIT);
    const done = FADE_WAIT + FADE_MS;
    if (openAfter !== null) later(() => setOpen(openAfter), Math.max(done, rollUp));
    if (then) later(then, done);
  }, []);

  const closeAll = useCallback(() => {
    transitionTo(baseRef.current, null, true);
  }, [transitionTo]);

  /** Someone tapped the tab in slot `pos` (0 = left, 1 = centre, 2 = right). */
  const tap = useCallback(
    (pos: number) => {
      const h = dispRef.current[pos];
      const base = baseRef.current;

      // The centre tab of an open dropdown: close it, and undo any swap.
      if (pos === 1 && openRef.current === h) {
        closeAll();
        return;
      }

      // The page being viewed (its tab is in the centre of the matching arrangement): no swap.
      // This also undoes any swap left over from an earlier tap.
      if (base.indexOf(h) === 1) {
        transitionTo(base, hasMenuRef.current[h] ? h : null, true);
        return;
      }

      // Another page: swap it into the centre, worked out from the matching arrangement.
      const target = swapToCenter(base, h);
      if (hasMenuRef.current[h]) {
        transitionTo(target, h, true);
      } else {
        // No dropdown (Home): swap, then go to the page. The swap is kept once we're there.
        transitionTo(target, null, true, () => {
          baseRef.current = target;
          activateRef.current(h);
        });
      }
    },
    [closeAll, transitionTo],
  );

  /** A subpage was picked: the labels stay as they are, and the dropdown rolls up. */
  const select = useCallback(() => {
    clearTimers();
    baseRef.current = [...dispRef.current];
    setOpen(null);
  }, []);

  // The page changed some other way (back button, a link): keep the viewed page's tab in the centre.
  useEffect(() => {
    if (!enabled || viewed == null) return;
    if (baseRef.current[1] === viewed) return;
    const next = swapToCenter(baseRef.current, viewed);
    baseRef.current = next;
    transitionTo(next, null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewed, enabled]);

  useEffect(() => () => clearTimers(), []);

  return { display, fading, openIdx, tap, closeAll, select };
}
