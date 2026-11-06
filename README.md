# Fairy-Tale Wand Christmas Tree: page transition for Next.js

When someone clicks or taps a link, an invisible wand spirals up the screen and draws a Christmas tree out of about 1,800 twinkling white lights while the page fades to black. A star lights up at the top and bursts into falling red and green sparks. 200ms later the page changes under the black screen, then the lights drift down and fade out as the new page appears. The whole thing takes about 1.9 seconds.

- **Preview it:** open `preview/tree-transition-preview.html` in any browser (double-click it), or use the private preview link from the chat.
- **Use it in your site:** copy the folder `components/tree-transition/` into your project (steps below).

Requires Next.js 15.3 or newer with the **App Router** (the `app/` folder). It uses `<Link>`'s `onNavigate` prop, which was added in Next.js 15.3. It does not need Tailwind or any other library.

---

## What's in this repo

| Path | What it is |
| --- | --- |
| `components/tree-transition/engine.ts` | The canvas animation. Plain TypeScript with no React in it. |
| `components/tree-transition/TreeTransitionProvider.tsx` | Draws the overlay and changes the page at the right moment. Goes in your root layout once. |
| `components/tree-transition/TransitionLink.tsx` | Use it in place of `next/link`'s `<Link>`. Same props. |
| `components/tree-transition/index.ts` | Lets you import everything from one place. |
| `app/` | A 3-page demo site that uses the component. You don't copy this into your site. |
| `preview/` | Builds the single-file preview page from the same engine. |

---

## Add it to your own Next.js site

### Step 1: Copy the folder

1. In your own project, find the folder that holds your components. In most Next.js projects that is `components/` at the top level (next to `app/` and `package.json`), or `src/components/` if your project has a `src/` folder.
2. Copy the whole `tree-transition` folder (all 4 files) from this repo into it. You should end up with, for example, `components/tree-transition/engine.ts`.

### Step 2: Wrap your site in the provider

1. Open your root layout file. It is `app/layout.tsx` (or `src/app/layout.tsx`).
2. Add this import near the top of the file:

   ```tsx
   import { TreeTransitionProvider } from "@/components/tree-transition";
   ```

   `@/` is a shortcut for your project's top folder. Next.js sets it up by default. If your editor says it can't find the module, use a relative path instead, such as `"../components/tree-transition"`.

3. Inside `<body>`, wrap everything in the provider:

   ```tsx
   <body>
     <TreeTransitionProvider>
       {children}
     </TreeTransitionProvider>
   </body>
   ```

   If your header/nav is in the layout, put it inside the provider too.

### Step 3: Swap your links

Anywhere you want the transition, replace `next/link`'s `Link` with `TransitionLink`:

```tsx
// before
import Link from "next/link";
<Link href="/about">About</Link>

// after
import { TransitionLink } from "@/components/tree-transition";
<TransitionLink href="/about">About</TransitionLink>
```

All the normal `Link` props still work (`className`, `prefetch`, `replace`, `scroll`, and so on).

These links skip the animation on purpose and behave normally:
- links to other websites
- links with `target="_blank"` or `download`
- Ctrl/Cmd/Shift + click (opening in a new tab)
- links to the same page with only a `#section` or `?query` change

### Step 4 (optional): Start it from your own code

For a button or form that changes page in code instead of a link:

```tsx
"use client";
import { useTreeTransition } from "@/components/tree-transition";

function CheckoutButton() {
  const { navigate } = useTreeTransition();
  return (
    <button onClick={(e) => navigate("/checkout", { origin: { x: e.clientX, y: e.clientY } })}>
      Checkout
    </button>
  );
}
```

`origin` is optional. It makes the sparks start from where the user clicked.

---

## Settings you can change

- **Number of lights:** `<TreeTransitionProvider particleCount={2400}>` (minimum 1500, default 1800).
- **Timing:** edit the `TIMING` object at the top of `engine.ts`:

  | Setting | Default | What it controls |
  | --- | --- | --- |
  | `summon` | 200ms | Sparks flying from the tap point to the tree base |
  | `draw` | 900ms | The wand drawing the tree |
  | `navDelay` | 200ms | Gap between the star burst and the page change |
  | `dissolve` | 500ms | Lights and overlay fading out on the new page |
  | `routeTimeout` | 4000ms | If the new page takes longer than this, fade out anyway |

- **Colours:** `SPARK_COLORS` near the top of `engine.ts` (white, gold, red, green as RGB numbers).

### Reduced motion

If a visitor has turned on "reduce motion" on their device, they get a quick plain fade to black and back (about 0.5s) with no particles. You can test this in the preview page with the "Preview reduced-motion version" checkbox.

To turn it on for real on your device:
- **iPhone:** Settings → Accessibility → Motion → Reduce Motion
- **Android:** Settings → Accessibility → Remove animations (name varies by phone)
- **Mac:** System Settings → Accessibility → Display → Reduce motion
- **Windows:** Settings → Accessibility → Visual effects → Animation effects (off)

---

## How it works

1. **Intercept.** `TransitionLink` passes an `onNavigate` handler to Next's `<Link>` and calls `e.preventDefault()` in it, which cancels Link's own page change. Then it starts the animation. On touch screens, passive `touchstart`/`touchmove`/`touchend` listeners start the animation the moment a finger lifts from a tap (a finger that moved more than 10px counts as a scroll and is ignored), so it does not wait for the browser's click.
2. **Fade to black.** The overlay (`position: fixed`, `z-index: 999`) fades from transparent to black over the time it takes to build the tree, reaching full black when the star lights up.
3. **The wand path.** For progress `p` from 0 (bottom) to 1 (peak):
   - radius shrinks as it climbs: `r = maxR · (1 − p)^1.08`
   - spiral angle: `θ = turns · 2π · p + 0.7 · sin(5p)` (the sine makes the turning speed uneven)
   - 3D projection: `x = cx + r · sin θ`, depth `z = cos θ`, and the front of each loop sits lower than the back
   - whip noise: `r · 0.42 · sin(63p) · sin(11p) + r · 0.14 · sin(101p)` added to x (and a little to y)

   Each run picks new random phases, so no two trees are the same.
4. **Lights.** As the wand moves it drops ~1,800 white lights. Each gets a small random velocity that slows to a stop within a fraction of a second, so they settle in place and twinkle. A second canvas holds the wand's glow trail, fading by 15% each frame (the `rgba(0,0,0,0.15)` alpha clear), using `destination-out` so the page can still show through while the overlay is fading in.
5. **Star and splash.** At the peak a star appears with a glow and light rays, and about 360 red and green sparks burst out. They have velocity, drag and gravity, so they arc up and fall, fading as they get near the bottom.
6. **Hand-off.** 200ms after the burst, `router.push()` runs. When `usePathname()` reports the new path, the provider calls `engine.reveal()`: the lights drift down and outward while fading, and the overlay fades out, over 500ms.

All particles are stored in typed arrays and drawn with one `requestAnimationFrame` loop. Glows are pre-drawn once and then copied, which is fast on phones.

---

## Run the demo site on your computer (optional)

You only need this if you want to try the demo Next.js site itself. The preview HTML file needs none of it.

1. **Install Node.js:** go to https://nodejs.org, download the version marked "LTS", and run the installer.
2. **Download this repo:** on its GitHub page, click the green **Code** button → **Download ZIP**, then unzip it. (Or, if you use git: `git clone` the repo URL.)
3. **Open a terminal in the folder:**
   - Mac: open the **Terminal** app, type `cd ` (with a space), drag the unzipped folder into the window, press Enter.
   - Windows: open the unzipped folder in File Explorer, click the address bar, type `cmd`, press Enter.
4. Type `npm install` and press Enter. Wait for it to finish (about a minute).
5. Type `npm run dev` and press Enter.
6. Open http://localhost:3000 in your browser and click the links at the top.
7. To stop the server, click in the terminal and press **Ctrl + C**.

To rebuild the preview HTML after changing `engine.ts`: `npm run build:preview`.
