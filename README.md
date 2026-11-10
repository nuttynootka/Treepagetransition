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
| `app/` | The demo site: Home, plus the 5 Shop pages and 3 Contact pages (placeholder text). |
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

# Noble Star Forest header

A header for the top of the site: a painted noble fir and western red cedar garland across the top, strung with fairy lights; the Noble Star Forest wood sign centred over it with its 8-point star glowing and twinkling; and three frosted glass plate tabs hanging from the garland on silver chains. Tapping a tab drops a hanging menu of more glass plates from under the centre tab. Everything is built in React, TypeScript and Tailwind CSS v4.

**Preview it:** open `preview/garland-header-preview.html` in a browser. **Building a site around it?** Read `DESIGN-BRIEF.md`: it has the sizes, colours, fonts and behaviour.

## What it does

- **Three fixed tabs** (left, centre, right) whose positions never change. Only the word on each changes. The centre tab always shows the page being viewed. At first open: Shop, Home, Us. Tapping a side tab swaps its word with the centre's (150ms fade out, 150ms fade in), then that page's dropdown unrolls from under the centre tab. Full rules are below.
- **Hanging menus** are frosted glass plates on silver chains that unroll with real physics (`chain-physics.ts`): each plate swings, tilts and twists on its own, with a faint breeze, and responds to a brush or tap.
- **The garland** is painted in code (`garland-painter.ts`) and repainted to fit the screen. About one fairy light per 8px sits on the foliage, each on its own slow 4.5–9 second sparkle.
- **The sign's star** glows and twinkles like a real star (`.gh-star` in `garland-header.css`).
- **Reduced motion:** lights and glints hold still, nothing swings, and the menu fades in and out instead of unrolling.

## Files

| Path | What it is |
| --- | --- |
| `components/garland-header/GarlandHeader.tsx` | The header. This is what you use. |
| `components/garland-header/PlateTab.tsx` | One tab plate. |
| `components/garland-header/GlassPlate.tsx` | The look of a glass plate, shared by tabs and menu plates. |
| `components/garland-header/HangingMenu.tsx` | The dropdown of plates on chains. |
| `components/garland-header/tab-swap.ts` | The swap logic (which word is in which slot). |
| `components/garland-header/chain-physics.ts` | The plate and chain physics. |
| `components/garland-header/garland-painter.ts` | Paints the garland. |
| `components/garland-header/parts.tsx` | The garland strip, sign, twinkling star, background lights. |
| `components/garland-header/geometry.ts` | Where lights, glints and tabs go. |
| `components/garland-header/noble-star-logo.ts` | The logo's image, ratio and star position. |
| `components/garland-header/garland-header.css` | Lights, glass, chains, sign star. |
| `public/brand/noble-star-forest.webp` | Your logo (the wood sign). |
| `public/brand/noble-star.webp` | The sign's star, cut out so it can glow. |
| `app/` | The demo site: Home, 4 Shop pages and 3 Us pages (placeholder text). |
| `preview/` | Builds the single-file preview (`npm run build:garland-preview`). |

## Use it

```tsx
import { GarlandHeader, type GarlandPage } from "@/components/garland-header";
import { TransitionLink } from "@/components/tree-transition";

const pages: GarlandPage[] = [
  { label: "Shop", items: [
    { href: "/statement-trees", label: "Statement Trees" },
    { href: "/wholesale-trees", label: "Wholesale Trees" },
    { href: "/wreaths-and-greenery", label: "Wreaths & Greenery" },
    { href: "/make-payment", label: "Make Payment" },
  ] },
  { href: "/", label: "Home" },
  { label: "Us", items: [
    { href: "/meet-us", label: "Meet Us" },
    { href: "/contact-us", label: "Contact Us" },
    { href: "/request-quote", label: "Request Quote" },
  ] },
];

<GarlandHeader pages={pages} activeHref={pathname} LinkComponent={TransitionLink} />
```

`app/SiteHeader.tsx` is the working example. The `pages` list must have exactly three entries, in the order the tabs first appear left to right. An entry with `href` goes straight to that page; an entry with `items` opens a dropdown.

| Prop | Default | What it does |
| --- | --- | --- |
| `pages` | (required) | The three entries |
| `activeHref` | (required) | The current path. Pass `usePathname()`. |
| `LinkComponent` | plain `<a>` | `next/link`'s `Link`, `TransitionLink`, or your own |
| `logoSrc` / `logoRatio` / `logoStar` / `logoAlt` | the Noble Star Forest sign | Your logo file, its width divided by height, where its star is, and its screen-reader text |
| `logo` | none | Any element to use instead of an image |
| `homeHref` | `"/"` | Where the logo links to |
| `garlandSrc` / `garlandFit` | none (painted garland) | Optional photo of a garland to use instead |

### The tab-swap rules

- **Tap a side tab:** its word and the centre's fade out (150ms), swap, and fade back in (150ms). Nothing slides. Then that page's dropdown unrolls from under the centre tab.
- **Pick a subpage:** the page loads, the words stay swapped, and that page's word stays in the centre.
- **Tap outside the dropdown, or press Escape:** the dropdown rolls up and the two words fade back to how they were.
- **Tap the centre tab:** its dropdown opens with no swap. Tap it again to close (undoing any swap).
- **Tap Home:** same swap, but Home has no dropdown, so it then goes to the home page.
- **Swaps are always worked out from the arrangement that matches the page being viewed**, not from what is on screen. So tapping Shop and then Us without choosing undoes Shop's swap first. The words on screen are always a rearrangement of the same three, so two tabs never show the same word, however fast someone taps. A new tap cancels whatever is in progress.
- Every plate is as wide as the widest word, so a swap changes only the text. Home is reached by pressing an out-of-sight link, so your page transition still plays.

## Sizes and settings

- **Sign height:** `--sign-h` near the top of `GarlandHeader.tsx` (116px phone, 132px from 640px, 152px from 768px, 168px from 1024px, 184px from 1280px). The garland is 3/8 of it (`--g`), runs behind the sign's middle, and the sign starts 4px from the top.
- **Words:** `--label-size` (12px, 13px from 768px, 14px from 1024px), set in Cuprum. Plates are `--menu-h` tall (26px, 28px from 768px). These are smaller than the 44px most touch guidelines recommend for tap targets.
- **Physics feel** (gravity, drag, breeze, twist, timing): the `PHYS` settings at the top of `chain-physics.ts`.
- **Light colours and sparkle:** `--gh-light` and `--gh-warm` and the `gh-sparkle` keyframes at the top of `garland-header.css`.
- **Garland look:** `LAYERS` and the colours in `drawFir` / `drawCedar` in `garland-painter.ts`.
- **Plate light:** white and warm gold, alternating (`PLATE_LIGHT_COLORS` in `geometry.ts`).

## Add it to another Next.js project

It needs React 18 or newer and Tailwind CSS v4.

1. **Tailwind:** if your project doesn't have v4 yet, run `npm install -D tailwindcss @tailwindcss/postcss postcss`, create `postcss.config.mjs` like this repo's, and add `@import "tailwindcss";` as the first line of your global CSS.
2. **Copy** the folder `components/garland-header/` and the two files in `public/brand/`.
3. **Font:** copy the `Cuprum` lines from `app/layout.tsx` (it loads the font as the CSS variable `--font-cuprum`).
4. **Use** `<GarlandHeader />` as shown above, at the top of `<body>`.

## Run the demo site (optional)

Install Node.js (nodejs.org, the "LTS" version), download this repo, open a terminal in its folder, run `npm install`, then `npm run dev`, and open http://localhost:3000.
