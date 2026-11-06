"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { formatPrice } from "./ProductCard";
import type { WreathProduct } from "./types";

interface ProductDetailsProps {
  product: WreathProduct | null;
  /** Shows an "Add to cart" button when given. */
  onAddToCart?: (product: WreathProduct) => void;
  titleId?: string;
  placeholder?: string;
}

/** Title, price and description of the wreath on the door, with an optional add-to-cart button. */
export function ProductDetails({ product, onAddToCart, titleId, placeholder = "Choose a wreath to see it on the door." }: ProductDetailsProps) {
  const reduced = useReducedMotionConfig();
  return (
    <div className="relative min-h-[8.5rem]">
      <AnimatePresence mode="wait" initial={false}>
        {product ? (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={titleId} className="m-0 font-serif text-[1.5rem] font-normal leading-tight text-[#f2eee7]">
                {product.title}
              </h2>
              <span className="shrink-0 text-lg tabular-nums text-[#d9b77a]">{formatPrice(product)}</span>
            </div>
            <p className="m-0 max-w-[60ch] text-[0.95rem] leading-relaxed text-[#b9b2a6]">{product.description}</p>
            {onAddToCart && (
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="mt-2 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full border-0 bg-[#ece8e1] px-6 text-[0.95rem] font-semibold text-[#161718] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b77a] sm:w-auto"
              >
                Add to cart · {formatPrice(product)}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.span
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="block pt-2 text-[0.95rem] text-[#8e877c]"
          >
            {placeholder}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
