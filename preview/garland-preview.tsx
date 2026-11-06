// Preview harness for the garland header: the real component and the real
// wand-tree engine, with a tiny fake router so it runs as one HTML page.
import { forwardRef, useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { GarlandHeader, type GarlandPage, type LinkLikeProps } from "../components/garland-header";
import { TreeTransitionEngine } from "../components/tree-transition/engine";

declare const PLACEHOLDER_LOGO: string;

const pages: GarlandPage[] = [
  { href: "/", label: "Home" },
  { href: "/workshop", label: "Workshop" },
  { href: "/letters", label: "Letters" },
  { href: "/gifts", label: "Gifts" },
];

const copy: Record<string, { title: string; body: string }> = {
  "/": { title: "Home", body: "Tap a snowflake. The wand draws a tree of lights, the page changes under it, and frost blooms on the new snowflake's glass." },
  "/workshop": { title: "The Workshop", body: "Brush the mouse across a snowflake to set it swinging, or tap one. Lights near your pointer or finger glow a little warmer." },
  "/letters": { title: "Letters", body: "Inactive snowflakes stay readable but rest at a dimmer twinkle. The active one is fully lit with a soft aura." },
  "/gifts": { title: "Gifts", body: "Try your own garland photo and logo below. They stay on your device and are never uploaded." },
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
  const [garland, setGarland] = useState<string | undefined>();
  const [logo, setLogo] = useState(PLACEHOLDER_LOGO);
  const [fit, setFit] = useState<"cover" | "repeat">("cover");
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
    if (href === current) {
      if (href === "/") return;
      href = "/";
    }
    pendingRef.current = href;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    engine.start({ origin, reducedMotion: reduced });
  }, [current]);

  const pick = (set: (url: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) set(URL.createObjectURL(file));
  };

  return (
    <>
      <GarlandHeader
        pages={pages}
        activeHref={current}
        LinkComponent={PreviewLink}
        garlandSrc={garland}
        garlandFit={fit}
        logoSrc={logo}
        logoAlt="Company logo"
      />
      <main className="page">
        <section aria-live="polite">
          <p className="eyebrow">Preview page</p>
          <h1>{copy[current].title}</h1>
          <p className="lede">{copy[current].body}</p>
        </section>
        <section className="tryout" aria-labelledby="try-title">
          <h2 id="try-title">Try your own images</h2>
          <p className="hint">Pick files from your phone or computer. Use a garland photo with a transparent background (PNG or WebP).</p>
          <div className="controls">
            <label className="file" htmlFor="garland-file">
              Choose garland photo
              <input id="garland-file" type="file" accept="image/*" onChange={pick(setGarland)} />
            </label>
            <label className="file" htmlFor="logo-file">
              Choose logo
              <input id="logo-file" type="file" accept="image/*" onChange={pick(setLogo)} />
            </label>
            <label className="check" htmlFor="repeat-fit">
              <input id="repeat-fit" type="checkbox" checked={fit === "repeat"} onChange={(e) => setFit(e.target.checked ? "repeat" : "cover")} />
              Tile the garland sideways
            </label>
          </div>
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
