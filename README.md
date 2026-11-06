# Fairy-Tale Wand Christmas Tree: page transition for Next.js

When someone clicks or taps a link, an invisible wand spirals up the screen and draws a Christmas tree out of about 1,800 twinkling white lights while the page fades to black. A star lights up at the top and bursts into falling red and green sparks. 200ms later the page changes under the black screen, then the lights drift down and fade out as the new page appears. The whole thing takes about 2.2 seconds.

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
| `app/` | A 4-page demo site that uses the transition and the garland header. You don't copy this into your site. |
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
  | `draw` | 1200ms | The wand drawing the tree |
  | `navDelay` | 200ms | Gap between the star burst and the page change |
  | `dissolve` | 500ms | Lights and overlay fading out on the new page |
  | `routeTimeout` | 4000ms | If the new page takes longer than this, fade out anyway |

- **Tree width:** in `engine.ts`, find `const maxR =` inside `resize()`. The first number is for phones (share of screen width), the second pair is for larger screens. Bigger numbers = wider tree.
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

---

# Garland header with snowflake page tabs

A header for the top of the site: your photo of a live-greenery garland across the top, strung with soft white fairy lights; your logo centred in a frosted oval ringed with its own lights; and one hanging snowflake per page. Each snowflake is outlined in fairy lights and has a round frosted-glass plate in the middle with the page name.

- The snowflake for the current page is fully lit, with brighter twinkling and a soft glowing aura.
- The other snowflakes stay readable and clickable but rest dimmer.
- When a page becomes active, frost crystals grow across its glass plate and then the title sharpens.
- Snowflakes swing gently when the mouse brushes past or a finger taps them, then settle.
- Lights near the mouse or finger glow a little warmer.
- Twinkles are slow opacity "breathing" (1.5–3 seconds per cycle), never flashing.
- With "reduce motion" turned on, lights stay steady, nothing swings, and the frost appears without growing.

**Preview it:** open `preview/garland-header-preview.html` in a browser, or use the private preview link from the chat. It has buttons to try your own garland photo and logo (they stay on your device).

## What's in it

| Path | What it is |
| --- | --- |
| `components/garland-header/GarlandHeader.tsx` | The header. This is what you use. |
| `components/garland-header/SnowflakeTab.tsx` | One hanging snowflake tab. |
| `components/garland-header/parts.tsx` | Fairy light, garland strip, logo frame, frost. |
| `components/garland-header/hooks.ts` | Swinging, pointer warmth, reduced motion, image check. |
| `components/garland-header/geometry.ts` | Where every light, snowflake line and frost crystal goes. |
| `components/garland-header/garland-header.css` | The twinkle, aura and frost animations. |
| `public/brand/logo.svg` | **Placeholder logo. Replace it with yours.** |
| `public/garland/` | **Put your garland photo here** as `garland.png`. |
| `app/SiteHeader.tsx` | How this demo site uses the header with the tree transition. |

## Step 1: Add your logo

1. Get your logo as an SVG (best, stays sharp) or a PNG with a transparent background, at least 600px wide.
2. In this project, open the folder `public`, then the folder `brand`.
3. Delete `logo.svg` and put your file there.
4. If your file is called exactly `logo.svg`, you're done. If it has another name (for example `acme.png`), open `app/SiteHeader.tsx` and add `logoSrc="/brand/acme.png"` inside `<GarlandHeader ... />`, next to `logoAlt`.
5. In the same place, change `logoAlt="Company logo"` to your company name. Screen readers read this out.

## Step 2: Add your garland photo

1. You need a **wide** photo of a garland with a **transparent background** (PNG or WebP). About 3000 × 400 pixels works well. A photo of a real garland on a plain background can be cut out with any "remove background" tool.
2. Open the folder `public`, then `garland`, and put the photo there named `garland.png`.
3. Reload the page. The dark green placeholder band is replaced by your photo.
4. Different name or format? Add `garlandSrc="/garland/your-file.webp"` to `<GarlandHeader ... />` in `app/SiteHeader.tsx`.
5. If your photo is a short piece that repeats seamlessly, add `garlandFit="repeat"` and it is tiled across the width. The default (`"cover"`) stretches one photo across and crops the sides on narrow screens, so keep the most important greenery near the middle.

The fairy lights are drawn on top of the photo in two woven strands, so they look right on any garland shape.

## Step 3: Change the pages

Open `app/SiteHeader.tsx`. The `pages` list sets the snowflakes, left to right:

```tsx
const pages: GarlandPage[] = [
  { href: "/", label: "Home" },
  { href: "/workshop", label: "Workshop" },
  { href: "/letters", label: "Letters" },
  { href: "/gifts", label: "Gifts" },
];
```

- On tablets and computers (768px wide and up), the first half hang left of the logo and the rest hang right. An even number looks most balanced.
- On phones they hang in one row with alternating short and long ribbons, so neighbours don't bump.
- Labels up to about 9 letters fit on one line; longer ones wrap.
- 3 to 6 pages fit well. More than 6 gets crowded on phones.

## Use it in another Next.js project

It needs React 18 or newer and Tailwind CSS v4.

1. **Tailwind:** if your project doesn't have Tailwind v4 yet, open a terminal in your project folder and run:

   ```
   npm install -D tailwindcss @tailwindcss/postcss postcss
   ```

   Then create a file called `postcss.config.mjs` next to `package.json` containing exactly what is in this repo's `postcss.config.mjs`, and add `@import "tailwindcss";` as the first line of your global CSS file (usually `app/globals.css`).
2. **Copy** the folder `components/garland-header/` (all 7 files) into your project's `components/` folder.
3. **Copy** `public/brand/logo.svg` and your garland photo into the same places in your project's `public/` folder.
4. **Font (optional):** the snowflake labels use Cormorant Garamond if it is loaded, through a CSS variable called `--font-cormorant`. Copy the `Cormorant_Garamond` lines from this repo's `app/layout.tsx` into your layout. Without it, labels fall back to Palatino or Georgia.
5. **Create** `app/SiteHeader.tsx` like the one in this repo, and put `<SiteHeader />` at the top of `<body>` in `app/layout.tsx`.
   - Using the tree transition too? Keep `LinkComponent={TransitionLink}`.
   - Not using it? Use `import Link from "next/link"` and `LinkComponent={Link}`.

### All the options

| Prop | Default | What it does |
| --- | --- | --- |
| `pages` | (required) | `{ href, label }` for each snowflake |
| `activeHref` | (required) | The current path. Pass `usePathname()`. |
| `garlandSrc` | `/garland/garland.png` | Your garland photo |
| `garlandFit` | `"cover"` | `"cover"` stretches one photo, `"repeat"` tiles it |
| `logoSrc` | `/brand/logo.svg` | Your logo file |
| `logo` | none | Any element (like an inline `<svg>`) to use instead of `logoSrc` |
| `logoAlt` | `"Company logo"` | Logo description for screen readers |
| `homeHref` | `"/"` | Where the logo links to |
| `LinkComponent` | plain `<a>` | `next/link`'s `Link`, `TransitionLink`, or your own |

### Sizes and colours

- **Garland height, snowflake size, logo frame size:** the `[--g:…]`, `[--flake:…]` and `[--logo-w:…]`/`[--logo-h:…]` classes near the top of `GarlandHeader.tsx`, one value per screen width (`sm:` 640px+, `md:` 768px+, `lg:` 1024px+, `xl:` 1280px+).
- **Ribbon lengths:** `NARROW` and `WIDE` in `placeTabs()` in `geometry.ts`.
- **Light colour:** `--gh-light` (the bulb, `#FFF5EB`) and `--gh-warm` (the warm glow) at the top of `garland-header.css`.
- **Twinkle brightness:** the `gh-rest` (inactive), `gh-soft` (garland and logo) and `gh-lit` (active) keyframes in `garland-header.css`.
- **Swing:** the period (`1.7`) and damping (`0.16`) in `useSwing()` in `hooks.ts`.

### Notes

- The header has its own dark night background. It is designed for dark pages; on a light page the bottom edge will show as a dark band.
- The header is about 280px tall on phones and 330–370px on computers. It is not sticky, so it scrolls away with the page.
- There are about 300 small lights. They animate only their opacity, which phones handle well.

To rebuild the preview page after changing the component: `npm run build:garland-preview`.
