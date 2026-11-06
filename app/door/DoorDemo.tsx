"use client";

import { WreathDoorStorefront } from "@/components/wreath-door";
import { makeDemoProducts } from "@/components/wreath-door/demoProducts";

const products = makeDemoProducts((file) => `/wreath-door/${file}`);

export function DoorDemo() {
  return (
    <div className="min-h-screen bg-[#0f1011] px-4 pb-16 pt-8 text-[#ece8e1] sm:px-6 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b77a]">The Winter Door</span>
          <h1 className="m-0 font-serif text-[clamp(2rem,5vw,3.25rem)] font-normal leading-[1.05] text-[#f4f1ea]">
            See it on your door
          </h1>
          <p className="m-0 max-w-[52ch] text-[#a39c90]">Pick a wreath. The door swings open, then closes with your wreath hanging on it.</p>
        </header>
        <WreathDoorStorefront
          products={products}
          // Put your interior photo in public/wreath-door/ and uncomment:
          // interior={{ src: "/wreath-door/interior.jpg", position: "50% 60%" }}
          onAddToCart={(p) => alert(`Demo only: "${p.title}" would be added to the cart.`)}
        />
      </div>
    </div>
  );
}
