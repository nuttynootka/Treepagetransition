"use client";

import { useCallback, useSyncExternalStore } from "react";

/** True while the media query matches. Always false during server rendering. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches Tailwind's `md` breakpoint: phones are anything under 768px wide. */
export const MOBILE_QUERY = "(max-width: 767.98px)";
