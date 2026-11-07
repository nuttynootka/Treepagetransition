// Preview harness for the garland header: the real component and the real
// wand-tree engine, with a tiny fake router so it runs as one HTML page.
import { forwardRef, useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { GarlandHeader, type CrystalImage, type GarlandPage, type LinkLikeProps } from "../components/garland-header";
import { NOBLE_STAR_LOGO } from "../components/garland-header/logo-outline";
import { TreeTransitionEngine } from "../components/tree-transition/engine";

declare const LOGO_URI: string;
declare const CRYSTALS: CrystalImage[];

const pages: GarlandPage[] = [
  { href: "/", label: "Home" },
  {
    label: "Shop",
    items: [
      { href: "/statement-trees", label: "Statement Trees" },
      { href: "/wholesale-trees", label: "Wholesale Trees" },
      { href: "/wreaths-and-greenery", label: "Wreaths & Greenery" },
      { href: "/firewood", label: "Firewood" },
      { href: "/make-payment", label: "Make Payment" },
    ],
  },
  {
    label: "Us",
    items: [
      { href: "/meet-us", label: "Meet Us" },
      { href: "/contact-us", label: "Contact Us" },
      { href: "/request-quote", label: "Request Quote" },
    ],
  },
];

const copy: Record<string, { title: string; body: string }> = {
  "/": {
    title: "Home",
    body: "Tap SHOP or US. Frosted glass plates unroll down on silver chains. Tap a plate and the menu rolls back up behind the garland while the wand draws its tree.",
  },
  ...Object.fromEntries(
    pages.flatMap((p) => p.items ?? []).map((item) => [
      item.href,
      { title: item.label, body: "Placeholder text. This page's content goes here. The snowflake for its menu stays lit while you're here." },
    ]),
  ),
};

// One shared navigate function, set by the App once the engine exists.
let navigateTo: (href: string, origin: { x: number; y: number }) => void = () => {};

const PreviewLink = forwardRef<HTMLAnchorElement, LinkLikeProps>(function PreviewLink({ href, onClick, ...rest }, ref) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const origin = e.detail === 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: e.clientX, y: e.clientY };
    navigateTo(href, origin);
  };
  return <a ref={ref} href={`#${href === "/" ? "home" : href.slice(1)}`} onClick={handle} {...rest} />;
});

function App() {
  const [current, setCurrent] = useState("/");
  const engineRef = useRef<TreeTransitionEngine | null>(null);
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    const engine = new TreeTransitionEngine({
      overlay: document.getElementById("tt-overlay")!,
      trailCanvas: document.getElementById("tt-trail") as HTMLCanvasElement,
      lightsCanvas: document.getElementById("tt-lights") as HTMLCanvasElement,
      onNavigate: () => {
        if (pendingRef.current) setCurrent(pendingRef.current);
        requestAnimationFrame(() => requestAnimationFrame(() => engine.reveal()));
      },
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  navigateTo = useCallback((href: string, origin: { x: number; y: number }) => {
    const engine = engineRef.current;
    if (!engine || engine.isActive) return;
    if (href === current) return;
    pendingRef.current = href;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    engine.start({ origin, reducedMotion: reduced });
  }, [current]);


  return (
    <>
      <GarlandHeader
        pages={pages}
        activeHref={current}
        LinkComponent={PreviewLink}
        crystals={CRYSTALS}
        logoSrc={LOGO_URI}
        logoOutline={NOBLE_STAR_LOGO.outline}
        logoAlt="Noble Star Forest"
      />
      <main className="page">
        <section aria-live="polite">
          <p className="eyebrow">Preview page</p>
          <h1>{copy[current].title}</h1>
          <p className="lede">{copy[current].body}</p>
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
