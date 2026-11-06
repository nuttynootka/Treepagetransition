// Preview harness: the real WreathDoorStorefront, bundled into one HTML page
// so it can be opened without a Next.js server.
import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { WreathDoorStorefront } from "../../components/wreath-door";
import { makeDemoProducts } from "../../components/wreath-door/demoProducts";
// @ts-ignore: esbuild inlines these as data: URLs
import citrus from "../../public/wreath-door/placeholder-citrus.svg";
// @ts-ignore
import eucalyptus from "../../public/wreath-door/placeholder-eucalyptus.svg";
// @ts-ignore
import frosted from "../../public/wreath-door/placeholder-frosted-cedar.svg";
// @ts-ignore
import fir from "../../public/wreath-door/placeholder-noble-fir.svg";

const files: Record<string, string> = {
  "placeholder-citrus.svg": citrus,
  "placeholder-eucalyptus.svg": eucalyptus,
  "placeholder-frosted-cedar.svg": frosted,
  "placeholder-noble-fir.svg": fir,
};
const products = makeDemoProducts((f) => files[f]);

function App() {
  const [reduced, setReduced] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b77a]">The Winter Door</span>
          <h1 className="m-0 font-serif text-[clamp(2.3rem,6vw,3.6rem)] font-medium leading-[1.02] text-[#f4f1ea] [text-wrap:balance]">
            See it on your door
          </h1>
          <p className="m-0 max-w-[52ch] text-[#a39c90]">
            Pick a wreath. The door swings open, then closes with your wreath hanging on it. On a phone, the preview opens full screen.
          </p>
        </header>

        <WreathDoorStorefront products={products} onAddToCart={(p) => setToast(`Demo only: ${p.title} would go in the cart.`)} />

        <footer className="flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-[#8e877c]">
          <label htmlFor="reduced" className="inline-flex cursor-pointer items-center gap-2">
            <input id="reduced" type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} className="h-4 w-4 accent-[#d9b77a]" />
            Preview the reduced-motion version
          </label>
          <span>Wreaths and the room behind the door are placeholders until the real photos are added.</span>
        </footer>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] flex justify-center px-4 pb-[max(20px,env(safe-area-inset-bottom))]"
      >
        {toast && <span className="rounded-full bg-[#ece8e1] px-4 py-2 text-sm font-medium text-[#161718] shadow-lg">{toast}</span>}
      </div>
    </MotionConfig>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
