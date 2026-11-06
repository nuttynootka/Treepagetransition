"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { WreathProduct } from "./types";

export function formatPrice(product: WreathProduct, locale?: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: product.currency ?? "USD" }).format(product.price);
}

interface ProductCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  product: WreathProduct;
  selected: boolean;
  /** Shows the "On the door" badge. */
  onDoor?: boolean;
  onSelect: (product: WreathProduct, el: HTMLButtonElement) => void;
}

/** A product tile. It is a real <button>, so it works with keyboard and screen readers. */
export const ProductCard = forwardRef<HTMLButtonElement, ProductCardProps>(function ProductCard(
  { product, selected, onDoor = false, onSelect, className = "", ...aria },
  ref,
) {
  const img = product.cardImage ?? product.image;
  return (
    <button
      ref={ref}
      type="button"
      {...aria}
      onClick={(e) => onSelect(product, e.currentTarget)}
      className={[
        "group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[#18191b] p-0 text-left text-[#ece8e1] transition-[border-color,box-shadow,transform] duration-300",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b77a] active:scale-[0.985]",
        selected
          ? "border-[#d9b77a]/70 shadow-[0_0_0_1px_rgba(217,183,122,0.35),0_18px_40px_-18px_rgba(217,183,122,0.35)]"
          : "border-white/10 hover:border-white/25",
        className,
      ].join(" ")}
    >
      <span className="relative block aspect-square w-full bg-[radial-gradient(70%_70%_at_50%_45%,#2a2c30,#151618)]">
        <img
          src={img.src}
          alt={img.alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-[8%] block h-[84%] w-[84%] object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </span>
      <span className="flex flex-col gap-1 px-4 pb-4 pt-3">
        <span className="font-serif text-[1.02rem] leading-snug tracking-[0.01em]">{product.title}</span>
        <span className="text-sm tabular-nums text-[#b9b2a6]">{formatPrice(product)}</span>
      </span>
      {onDoor && (
        <span className="absolute right-3 top-3 rounded-full bg-[#d9b77a] px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#1b1b1c]">
          On the door
        </span>
      )}
    </button>
  );
});
