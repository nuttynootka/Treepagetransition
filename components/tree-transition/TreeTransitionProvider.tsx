"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TreeTransitionEngine, type TransitionOrigin } from "./engine";

export interface NavigateOptions {
  /** Where the click or tap happened, so the sparks start from there. */
  origin?: TransitionOrigin | null;
  /** Use router.replace instead of router.push. */
  replace?: boolean;
  /** Passed through to router.push / router.replace. */
  scroll?: boolean;
}

interface TreeTransitionContextValue {
  /** Play the tree transition, then go to `href`. */
  navigate: (href: string, options?: NavigateOptions) => void;
  /** True while the overlay is on screen. Read it inside event handlers, not during render. */
  isTransitioning: () => boolean;
}

const TreeTransitionContext = createContext<TreeTransitionContextValue | null>(null);

export function useTreeTransition(): TreeTransitionContextValue {
  const ctx = useContext(TreeTransitionContext);
  if (!ctx) throw new Error("useTreeTransition must be used inside <TreeTransitionProvider>.");
  return ctx;
}

interface ProviderProps {
  children: ReactNode;
  /** Number of white tree lights (minimum 1500). Default 1800. */
  particleCount?: number;
}

/**
 * Put this once in your root layout (app/layout.tsx), around {children}.
 * It renders the full-screen overlay and listens for the new page mounting.
 */
export function TreeTransitionProvider({ children, particleCount = 1800 }: ProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const overlayRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const lightsRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TreeTransitionEngine | null>(null);
  const pendingRef = useRef<{ href: string; replace: boolean; scroll?: boolean } | null>(null);

  // Keep the latest router in a ref so the engine callback never goes stale.
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const engine = new TreeTransitionEngine({
      overlay: overlayRef.current!,
      trailCanvas: trailRef.current!,
      lightsCanvas: lightsRef.current!,
      particleCount,
      onNavigate: () => {
        const pending = pendingRef.current;
        if (!pending) return;
        const opts = pending.scroll === undefined ? undefined : { scroll: pending.scroll };
        if (pending.replace) routerRef.current.replace(pending.href, opts);
        else routerRef.current.push(pending.href, opts);
      },
      onDone: () => {
        pendingRef.current = null;
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, [particleCount]);

  // The new page has mounted once the pathname changes after we navigated.
  useEffect(() => {
    const engine = engineRef.current;
    if (engine && engine.hasNavigated) engine.reveal();
  }, [pathname]);

  const navigate = useCallback((href: string, options: NavigateOptions = {}) => {
    const engine = engineRef.current;
    const router = routerRef.current;
    if (!engine || engine.isActive) return;

    // Same page (only the #hash or ?query changes): no transition, just go.
    const target = new URL(href, window.location.href);
    if (target.pathname === window.location.pathname) {
      if (options.replace) router.replace(href, { scroll: options.scroll });
      else router.push(href, { scroll: options.scroll });
      return;
    }

    // Start loading the next page now, so it is ready by the hand-off.
    router.prefetch(href);
    pendingRef.current = { href, replace: !!options.replace, scroll: options.scroll };

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    engine.start({ origin: options.origin, reducedMotion });
  }, []);

  const value = useMemo<TreeTransitionContextValue>(
    () => ({ navigate, isTransitioning: () => !!engineRef.current?.isActive }),
    [navigate],
  );

  return (
    <TreeTransitionContext.Provider value={value}>
      {children}
      {/* Inline styles so this works with or without Tailwind. */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          display: "none",
          pointerEvents: "none",
          backgroundColor: "rgba(0,0,0,0)",
          touchAction: "none",
        }}
      >
        <canvas ref={trailRef} style={canvasStyle} />
        <canvas ref={lightsRef} style={canvasStyle} />
      </div>
    </TreeTransitionContext.Provider>
  );
}

const canvasStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
};
