"use client";

import { motion, useReducedMotionConfig } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DoorScene } from "./DoorScene";
import { ProductDetails } from "./ProductDetails";
import type { DoorEffects, DoorSelection, InteriorImage, WreathProduct } from "./types";

interface MobilePreviewDialogProps {
  id: string;
  product: WreathProduct;
  /** Returns the on-screen box of the card that was tapped, so the dialog can grow out of it and shrink back into it. */
  getOriginRect: () => DOMRect | null;
  /** Called after the closing animation has finished. */
  onClosed: () => void;
  interior?: InteriorImage;
  effects?: DoorEffects;
  onAddToCart?: (product: WreathProduct) => void;
}

const HISTORY_KEY = "wreathDoorDialog";
const EASE = [0.32, 0.72, 0, 1] as const;

function clipFrom(rect: DOMRect | null) {
  if (!rect) return "inset(40% 10% 40% 10% round 16px)";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return `inset(${rect.top}px ${vw - rect.right}px ${vh - rect.bottom}px ${rect.left}px round 16px)`;
}
const FULL = "inset(0px 0px 0px 0px round 0px)";

/**
 * Phone view: a full-screen dialog that grows out of the tapped card, then
 * plays the door sequence. Closes with the X button, the Escape key, or the
 * phone's back button/gesture.
 */
export function MobilePreviewDialog({ id, product, getOriginRect, onClosed, interior, effects, onAddToCart }: MobilePreviewDialogProps) {
  const reduced = useReducedMotionConfig() ?? false;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const [from] = useState(() => clipFrom(getOriginRect()));
  const [target, setTarget] = useState<"open" | "closed">("open");
  const [selection, setSelection] = useState<DoorSelection | null>(null);

  const requestClose = useCallback(
    (fromHistory: boolean) => {
      if (closingRef.current) return;
      closingRef.current = true;
      // Remove the history entry we added, unless the back button already did.
      if (!fromHistory && window.history.state?.[HISTORY_KEY]) {
        try {
          window.history.back();
        } catch {
          /* history blocked (e.g. sandboxed frame): just close */
        }
      }
      setTarget("closed");
    },
    [],
  );

  // Back button / back gesture closes the dialog instead of leaving the page.
  useEffect(() => {
    if (!window.history.state?.[HISTORY_KEY]) {
      try {
        window.history.pushState({ ...(window.history.state ?? {}), [HISTORY_KEY]: true }, "");
      } catch {
        /* history blocked (e.g. sandboxed frame): X and Escape still close */
      }
    }
    const onPop = () => requestClose(true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [requestClose]);

  // Lock page scroll and move focus into the dialog.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes; Tab stays inside the dialog.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose(false);
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onAnimationComplete = () => {
    if (target === "open") setSelection((s) => s ?? { product, nonce: 1 });
    else onClosed();
  };

  const motionProps = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: target === "open" ? 1 : 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { clipPath: from },
        animate: { clipPath: target === "open" ? FULL : clipFrom(getOriginRect()) },
        transition: { duration: target === "open" ? 0.55 : 0.42, ease: EASE },
      };

  return createPortal(
    <motion.div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      {...motionProps}
      onAnimationComplete={onAnimationComplete}
      className="fixed inset-0 z-[1000] flex flex-col overflow-y-auto overscroll-contain bg-[#0f1011] text-[#ece8e1] will-change-[clip-path]"
    >
      <motion.div
        className="flex min-h-full flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: target === "open" ? 1 : 0 }}
        transition={{ duration: 0.3, delay: target === "open" && !reduced ? 0.15 : 0 }}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-2 pt-[max(64px,calc(env(safe-area-inset-top)+56px))]">
          <div className="w-full" style={{ maxWidth: "min(100%, calc((100dvh - 300px) * 0.8))", minWidth: "220px" }}>
            <DoorScene selection={selection} interior={interior} effects={effects} className="rounded-2xl" />
          </div>
        </div>
        <div className="border-t border-white/10 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <ProductDetails product={product} onAddToCart={onAddToCart} titleId={titleId} />
        </div>
      </motion.div>

      <button
        ref={closeRef}
        type="button"
        aria-label="Close preview"
        onClick={() => requestClose(false)}
        className="fixed right-3 top-[max(12px,env(safe-area-inset-top))] z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 p-0 text-[#ece8e1] backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b77a]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.div>,
    document.body,
  );
}
