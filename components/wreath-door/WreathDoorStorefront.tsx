"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DoorScene } from "./DoorScene";
import { MobilePreviewDialog } from "./MobilePreviewDialog";
import { ProductCard } from "./ProductCard";
import { ProductDetails } from "./ProductDetails";
import { MOBILE_QUERY, useMediaQuery } from "./useMediaQuery";
import type { DoorEffects, DoorPhase, DoorSelection, InteriorImage, WreathProduct } from "./types";

export interface WreathDoorStorefrontProps {
  products: WreathProduct[];
  /** Photo of the room seen when the door opens. */
  interior?: InteriorImage;
  /** Turn individual effects off. All are on by default. */
  effects?: DoorEffects;
  /** Desktop only: hang this product when the page loads (plays the sequence once). */
  initialProductId?: string;
  /** Shows an "Add to cart" button under the preview when given. */
  onAddToCart?: (product: WreathProduct) => void;
  /** Accessible name for the product list. */
  listLabel?: string;
  className?: string;
}

/**
 * Product grid plus the front-door preview.
 * - Desktop (768px and up): the door is always on screen beside the grid.
 *   Clicking a card swings the door open and shut with the new wreath.
 * - Phone: tapping a card grows a full-screen preview out of the card.
 */
export function WreathDoorStorefront({
  products,
  interior,
  effects,
  initialProductId,
  onAddToCart,
  listLabel = "Wreaths",
  className = "",
}: WreathDoorStorefrontProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const stageId = useId();
  const dialogId = useId();
  const nonce = useRef(0);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  // Desktop state.
  const [selection, setSelection] = useState<DoorSelection | null>(null);
  const [onDoor, setOnDoor] = useState<WreathProduct | null>(null);

  // Phone state.
  const [dialogProduct, setDialogProduct] = useState<WreathProduct | null>(null);

  useEffect(() => {
    if (isMobile || !initialProductId) return;
    const p = products.find((x) => x.id === initialProductId);
    if (p) setSelection((s) => s ?? { product: p, nonce: ++nonce.current });
  }, [isMobile, initialProductId, products]);

  // Leaving phone width while the dialog is open: close it.
  useEffect(() => {
    if (!isMobile) setDialogProduct(null);
  }, [isMobile]);

  const handleSelect = useCallback(
    (product: WreathProduct) => {
      if (isMobile) setDialogProduct(product);
      else setSelection({ product, nonce: ++nonce.current });
    },
    [isMobile],
  );

  // The details panel follows the wreath that is actually on the door.
  const handlePhase = useCallback((_phase: DoorPhase, product: WreathProduct | null) => {
    setOnDoor(product);
  }, []);

  // After the dialog closes, put focus back on the card that opened it. This
  // runs after React has re-rendered, when the list is no longer `inert`.
  const returnFocusTo = useRef<string | null>(null);
  const closeDialog = useCallback(() => {
    returnFocusTo.current = dialogProduct?.id ?? null;
    setDialogProduct(null);
  }, [dialogProduct]);
  useEffect(() => {
    if (dialogProduct || !returnFocusTo.current) return;
    cardRefs.current.get(returnFocusTo.current)?.focus({ preventScroll: true });
    returnFocusTo.current = null;
  }, [dialogProduct]);

  return (
    <div className={`text-[#ece8e1] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start md:gap-10 lg:gap-14 ${className}`}>
      <ul
        aria-label={listLabel}
        inert={dialogProduct ? true : undefined}
        className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4 lg:grid-cols-3"
      >
        {products.map((p) => {
          const open = dialogProduct?.id === p.id;
          const a11y = isMobile
            ? { "aria-haspopup": "dialog" as const, "aria-expanded": open, "aria-controls": open ? dialogId : undefined }
            : { "aria-pressed": selection?.product.id === p.id, "aria-controls": stageId };
          return (
            <li key={p.id}>
              <ProductCard
                ref={(el) => {
                  if (el) cardRefs.current.set(p.id, el);
                  else cardRefs.current.delete(p.id);
                }}
                product={p}
                selected={isMobile ? open : selection?.product.id === p.id}
                onDoor={!isMobile && onDoor?.id === p.id}
                onSelect={handleSelect}
                aria-label={`${p.title}. Preview on the door`}
                {...a11y}
              />
            </li>
          );
        })}
      </ul>

      {/* Desktop: the door stays mounted. Hidden by CSS on phones before JS loads, then not rendered at all. */}
      {!isMobile && (
        <section id={stageId} aria-label="Front door preview" className="hidden md:sticky md:top-6 md:flex md:flex-col md:items-center md:gap-5">
          {/* Keep the whole door on screen: cap the width so the 4:5 stage fits the window height. */}
          <div className="w-full" style={{ maxWidth: "min(100%, calc((100svh - 13rem) * 0.8))" }}>
            <DoorScene selection={selection} interior={interior} effects={effects} onPhaseChange={handlePhase} className="rounded-3xl" />
          </div>
          <div className="w-full" style={{ maxWidth: "min(100%, calc((100svh - 13rem) * 0.8))" }}>
            <ProductDetails product={onDoor} onAddToCart={onAddToCart} />
          </div>
        </section>
      )}

      {isMobile && dialogProduct && (
        <MobilePreviewDialog
          key={dialogProduct.id}
          id={dialogId}
          product={dialogProduct}
          getOriginRect={() => cardRefs.current.get(dialogProduct.id)?.getBoundingClientRect() ?? null}
          onClosed={closeDialog}
          interior={interior}
          effects={effects}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
}
