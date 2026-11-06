// Preview harness: the same engine as the Next.js component, driven by a
// tiny fake router so it can run as a single HTML page with no server.
import { TreeTransitionEngine } from "../components/tree-transition/engine";

const pages: Record<string, { title: string; body: string }> = {
  home: {
    title: "Home",
    body: "Tap a page name above. The wand draws a tree of lights, the star bursts, and the next page appears underneath.",
  },
  workshop: {
    title: "The Workshop",
    body: "This page was swapped in while the screen was fully black, 200ms after the star burst. Then the lights drifted down and faded out.",
  },
  letters: {
    title: "Letters",
    body: "A third page, so you can hop around and watch the tree a few times. Each run spirals a little differently.",
  },
};

const overlay = document.getElementById("tt-overlay")!;
const engine = new TreeTransitionEngine({
  overlay,
  trailCanvas: document.getElementById("tt-trail") as HTMLCanvasElement,
  lightsCanvas: document.getElementById("tt-lights") as HTMLCanvasElement,
  onNavigate: () => {
    if (pending) render(pending);
    // Like Next.js: the new page mounts, then the provider calls reveal().
    requestAnimationFrame(() => engine.reveal());
  },
});

let current = "home";
let pending: string | null = null;
const reduced = document.getElementById("reduced") as HTMLInputElement;
const timerEl = document.getElementById("timer")!;

function render(key: string) {
  current = key;
  document.getElementById("page-title")!.textContent = pages[key].title;
  document.getElementById("page-body")!.textContent = pages[key].body;
  document.querySelectorAll<HTMLButtonElement>("[data-page]").forEach((b) => {
    b.setAttribute("aria-current", b.dataset.page === key ? "page" : "false");
  });
}

function go(key: string, origin: { x: number; y: number } | null) {
  if (engine.isActive) return;
  if (key === current) key = key === "home" ? "workshop" : "home";
  pending = key;
  const t0 = performance.now();
  engine.start({ origin, reducedMotion: reduced.checked });
  const watch = () => {
    if (engine.isActive) requestAnimationFrame(watch);
    else timerEl.textContent = `Last run: ${((performance.now() - t0) / 1000).toFixed(2)}s`;
  };
  requestAnimationFrame(watch);
}

// Passive touch: start the instant a tap lifts (not a scroll).
document.querySelectorAll<HTMLButtonElement>("[data-page]").forEach((btn) => {
  let tap: { x: number; y: number; moved: boolean } | null = null;
  let touched = false;
  btn.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    tap = { x: t.clientX, y: t.clientY, moved: false };
  }, { passive: true });
  btn.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (tap && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 10) tap.moved = true;
  }, { passive: true });
  btn.addEventListener("touchend", () => {
    if (tap && !tap.moved) {
      touched = true;
      setTimeout(() => (touched = false), 800);
      go(btn.dataset.page!, { x: tap.x, y: tap.y });
    }
    tap = null;
  }, { passive: true });
  btn.addEventListener("click", (e) => {
    if (touched) return;
    const r = btn.getBoundingClientRect();
    const origin = e.detail === 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: e.clientX, y: e.clientY };
    go(btn.dataset.page!, origin);
  });
});

render("home");
