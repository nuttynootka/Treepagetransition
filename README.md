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

# Garland header with snowflake page tabs

A header for the top of the site: a painted noble fir and western red cedar garland across the top, strung with fairy lights; the Noble Star Forest sign centred over it, its 8-point star glowing and twinkling; and one hanging 8-point star per menu item in 14K unplated palladium white gold with a glass-bead blasted satin finish, the same north-star shape as the star on the sign, catching the white and gold Christmas lights. Each word is etched in dark straight onto its star, with the facets fading to soft frosted crystal behind it so it stays readable.

- Each star turns slowly back and forth on its ribbon (3.6–5.2 seconds each way, each at its own pace). As it turns, a soft band of light sweeps across the bevels and the bead-blasted grain glitters in white and warm gold where the light passes; a few small white and gold glints sparkle at the points.
- The snowflake for the current page is fully lit with deeper contrast and a soft aura behind it.
- The other snowflakes stay readable and clickable but rest in shadow, with only a few slow glints.
- All menu words are the same size (`--label-size` in `GarlandHeader.tsx`: 13px on phones, 14px on tablets, 15px on computers), set in Yanone Kaffeesatz, on the stars and the hanging plates alike. Each word sits directly on its star where the points meet. Behind it, the facets fade into an oval of soft frosted crystal sized to the word (`.gh-text-fade` in `garland-header.css`), kept within the star's shape, so a longer word runs on into the side points.
- When a page becomes active, its word sharpens into focus.
- Snowflakes swing gently when the mouse brushes past or a finger taps them, then settle.
- Lights near the mouse or finger glow a little warmer.
- Garland lights are small, crisp bulbs that rest at about 40% and flare to full brightness for a moment, each on its own slow cycle (4.5–9 seconds), so they sparkle at random. Tune it in the `gh-sparkle` keyframes in `garland-header.css`. Crystal glints flare briefly every few seconds. Nothing strobes.
- With "reduce motion" turned on, lights and glints stay steady, and nothing swings or turns.

**Preview it:** open `preview/garland-header-preview.html` in a browser, or use the private preview link from the chat.

## What's in it

| Path | What it is |
| --- | --- |
| `components/garland-header/GarlandHeader.tsx` | The header. This is what you use. |
| `components/garland-header/SnowflakeTab.tsx` | One hanging snowflake tab. |
| `components/garland-header/HangingMenu.tsx` | The drop-down menu of glass plates on chains. |
| `components/garland-header/chain-physics.ts` | The physics that makes each plate swing, twist and settle on its own. |
| `components/garland-header/parts.tsx` | Fairy light, garland, logo sign, background lights. |
| `components/garland-header/hooks.ts` | Swinging, pointer warmth, reduced motion, image check. |
| `components/garland-header/geometry.ts` | Where every light and glint goes, and where each snowflake hangs. |
| `components/garland-header/garland-header.css` | The twinkle, crystal light, glass and aura styles. |
| `public/stars/` | The 3 white gold star pictures. |
| `scripts/make-gold-stars.py` | Draws those star pictures (shape, bevels, metal colour, satin grain, lighting). Run `python3 scripts/make-gold-stars.py` after changing it. |
| `public/brand/noble-star-forest.webp` | Your logo (the wood sign). |
| `components/garland-header/garland-painter.ts` | Paints the noble fir and western red cedar garland. |
| `components/garland-header/noble-star-logo.ts` | The sign's image, shape ratio, and where its star is. |
| `public/brand/noble-star.webp` | The star cut out of the sign, drawn over it so it can glow. |
| `app/SiteHeader.tsx` | How this demo site uses the header with the tree transition. |

## The logo and the garland

**Logo.** The Noble Star Forest sign is `public/brand/noble-star-forest.webp` (your logo, cropped and resized to 1000px wide). It is centred on the page, twice as tall as the garland is thick, and centred on the garland so the garland runs behind it. The 8-point star in "STAR" glows and twinkles like a real star: a cut-out copy of the star (`public/brand/noble-star.webp`) is drawn over it, brightened, with a soft warm halo that slowly swells, fine rays along its points that lengthen and fade on their own rhythms, a hot white centre, and a faint irregular flicker between warm and icy white. Its position is in `components/garland-header/noble-star-logo.ts`; the effect is the `.gh-star` styles in `garland-header.css`. To change the size, change the garland thickness (`--g` near the top of `GarlandHeader.tsx`); the sign is always twice that.

**Garland.** The noble fir and western red cedar garland is painted in code by `components/garland-header/garland-painter.ts`, from the reference photos (which are not used in the site):

- Noble fir: dense, short, blue-green to silvery needles that curve upward, on stiff sprigs.
- Western red cedar: flat, lacy, bright yellow-green sprays on orange-brown stems, drooping below the garland and tucked in along the top.
- Layers go from dark at the back to bright in front, with a soft shadow under each sprig. It runs the full width of the screen and is repainted to fit when the window changes size.
- Fairy lights are scattered through the whole garland, from the top sprigs to the hanging cedar and edge to edge, about one per 8px of width. Each is placed only where there is painted foliage, so none float in a gap (`lightsOnFoliage` in `parts.tsx`).
- To adjust it, edit `LAYERS` (how many sprigs of each kind, how bright, how long) and the colours in `drawFir` and `drawCedar`.
- To use a photo of a real garland instead, pass `garlandSrc="/garland/your-photo.webp"` to `<GarlandHeader>`.

## Step 3: Change the menu

Open `app/SiteHeader.tsx`. The `pages` list sets the snowflakes, left to right:

```tsx
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
```

- An entry with `href` is a snowflake that goes straight to that page (Home).
- An entry with `items` is a snowflake that opens a **hanging menu** instead of going to a page (Shop, Contact). Its snowflake lights up while you're on any page in its menu.
- Labels are typed in normal case and shown in capitals. Screen readers read the normal case.
- To use "Wreaths & Boughs" instead, change the `label` (and the page heading in `app/wreaths-and-greenery/page.tsx`).
- Each menu page is a folder in `app/` with a `page.tsx` inside. Their text is placeholder for now.

### How the hanging menu works

- Tapping SHOP or US drops a series of light frosted glass plates (the same glass as the snowflake centres, words etched in dark) on silver chains, down the middle of the page. Two chains hang from the garland behind the logo to the first plate, which hangs just below the snowflakes; each plate below hangs from the one above by two shorter chains nearer its middle.
- The plates catch white and warm gold light, alternating. It shows as small glints along the plate's edges and a faint tinted reflection that slides across the glass as the plate twists. The plates don't glow. Colours: `PLATE_LIGHT_COLORS` in `geometry.ts`.
- The plates move by **physics**, not a fixed animation (`chain-physics.ts`). Each plate is a rigid body with gravity, air drag and its own chains, which pull when stretched and go slack when not. Because every plate hangs from a moving plate above it, they swing, tilt and twist separately and never in unison, much like a chain of pendulums.
- Opening: the garland chains lower the first plate with an ease in and out, quick enough that it briefly runs ahead of the chains and gets a soft, bouncy catch. Each plate below starts folded up against the bottom of the plate above and swings down on that edge with a little flutter, its chains paying out quickly so it drops a short way, once the plate above is about half unfolded. Each gets a small random nudge so no two openings look alike. Then they sway and settle.
- A faint, random breeze keeps each plate drifting slightly on its own. Moving the mouse across a plate, or tapping it, pushes it, and the motion travels up and down the chain.
- Each plate also twists a few degrees toward and away from you as it moves.
- Closing reels the plates back up, bottom plate first, until they are hidden behind the garland.
- Tapping the snowflake again, tapping anywhere else, or pressing Escape rolls the plates back up, bottom plate first, until they are hidden behind the garland.
- Tapping a plate rolls the menu up and goes to that page, with the wand-tree transition.
- Only one menu is open at a time. Opening the other one rolls the first one up.
- With "reduce motion" on, the plates hang still and the menu fades in and out.
- Each plate is only as wide as its label, with a few pixels of glass on each side. Height and text size: `--menu-h` and `--menu-font` near the top of `GarlandHeader.tsx`. How heavy and lively the plates feel (gravity, drag, breeze, twist, drop and reel timing): the `PHYS` settings at the top of `chain-physics.ts`.

## Use it in another Next.js project

It needs React 18 or newer and Tailwind CSS v4.

1. **Tailwind:** if your project doesn't have Tailwind v4 yet, open a terminal in your project folder and run:

   ```
   npm install -D tailwindcss @tailwindcss/postcss postcss
   ```

   Then create a file called `postcss.config.mjs` next to `package.json` containing exactly what is in this repo's `postcss.config.mjs`, and add `@import "tailwindcss";` as the first line of your global CSS file (usually `app/globals.css`).
2. **Copy** the folder `components/garland-header/` (all 7 files) into your project's `components/` folder.
3. **Copy** `public/brand/noble-star-forest.webp` and the `public/snowflakes/` folder into the same places in your project's `public/` folder.
4. **Font:** the menu words use Yanone Kaffeesatz (from Google Fonts), through a CSS variable called `--font-yanone`. Copy the `Yanone_Kaffeesatz` lines from this repo's `app/layout.tsx` into your layout. Without it, words fall back to Arial Narrow or another narrow sans-serif.
5. **Create** `app/SiteHeader.tsx` like the one in this repo, and put `<SiteHeader />` at the top of `<body>` in `app/layout.tsx`.
   - Using the tree transition too? Keep `LinkComponent={TransitionLink}`.
   - Not using it? Use `import Link from "next/link"` and `LinkComponent={Link}`.

### All the options

| Prop | Default | What it does |
| --- | --- | --- |
| `pages` | (required) | `{ href, label }` for a page snowflake, or `{ label, items }` for a menu snowflake |
| `activeHref` | (required) | The current path. Pass `usePathname()`. |
| `garlandSrc` | none (painted garland) | Optional photo of a garland to use instead |
| `garlandFit` | `"cover"` | `"cover"` stretches one photo, `"repeat"` tiles it |
| `logoSrc` | `/brand/noble-star-forest.webp` | Your logo file |
| `logoRatio` | 1.8349 | The logo's width divided by its height |
| `logoStar` | the sign's star | Where the logo's star is, so it glows; leave out for no star effect |
| `logo` | none | Any element (like an inline `<svg>`) to use instead of `logoSrc` |
| `logoAlt` | `"Noble Star Forest"` | Logo description for screen readers |
| `homeHref` | `"/"` | Where the logo links to |
| `crystals` | the 3 in `public/stars/` | Crystal pictures, used in turn for each page (see below) |
| `LinkComponent` | plain `<a>` | `next/link`'s `Link`, `TransitionLink`, or your own |

### Sizes and colours

- **Garland height, snowflake size, logo frame size:** the `[--g:…]`, `[--flake:…]` and `[--logo-w:…]`/`[--logo-h:…]` classes near the top of `GarlandHeader.tsx`, one value per screen width (`sm:` 640px+, `md:` 768px+, `lg:` 1024px+, `xl:` 1280px+).
- **Ribbon lengths:** `NARROW` and `WIDE` in `placeTabs()` in `geometry.ts`.
- **Light colour:** `--gh-light` (the bulb, `#FFF5EB`) and `--gh-warm` (the warm glow) at the top of `garland-header.css`.
- **Garland sparkle:** the `gh-sparkle` keyframes in `garland-header.css`; bulb size: `--gh-core` / `--gh-halo` in `parts.tsx`.
- **Crystal brightness:** `.gh-crystal` rules in `garland-header.css` (inactive dimness, active shimmer).
- **Glints:** how many and which colours in `crystalGlints()` in `geometry.ts`; how they flash in the `gh-glint` and `gh-fleck` keyframes.
- **Swing:** the period (`1.7`) and damping (`0.16`) in `useSwing()` in `hooks.ts`.

### Notes

- The header has its own dark night background. It is designed for dark pages; on a light page the bottom edge will show as a dark band.
- The header is about 240px tall on phones (stars about 80px wide), 255–285px on tablets and 385–400px on computers. Open menus hang over the page below it. It is not sticky, so it scrolls away with the page.
- There are about 80 garland and logo lights and 18 glints per snowflake. Most animate only opacity and size, which phones handle well. The lit snowflake also animates its brightness.

### Using different crystal pictures

1. Each picture should be square, with a transparent background, with the snowflake's round plate exactly in the centre.
2. Save it as WebP or PNG, about 440 × 440 pixels, in `public/snowflakes/`.
3. Measure the plate: its width inside the silver rim divided by the picture's width. For example a 160px plate in a 440px picture is `0.36`.
4. Pass them in `app/SiteHeader.tsx`:

   ```tsx
   crystals={[
     { src: "/snowflakes/my-flake-1.webp", plate: 0.36 },
     { src: "/snowflakes/my-flake-2.webp", plate: 0.37 },
   ]}
   ```

The word and its frosted fade are drawn over the star's centre. The `plate` number is no longer used for sizing and is kept for compatibility.

To rebuild the preview page after changing the component: `npm run build:garland-preview`.

### The white gold stars

The menu tabs are 8-point stars in the north-star shape of the star on the sign: a tall top point, a longer bottom point, and shorter side and diagonal points (lengthened a little so the star reads clearly around its word). They are drawn as 14K unplated palladium white gold, a soft, slightly warm grey-white, with each point bevelled into four faces meeting at a ridge and a low eight-sided pyramid where the points meet. The finish is glass-bead blasted: a fine matte satin grain with soft, broad highlights rather than mirror shine. As each star turns on its ribbon, a soft band of light sweeps across it and the grain glitters in white and warm gold where the light passes (`.gh-glitter` in `garland-header.css`). Only white and gold light is used on the stars and the menu plates. The three pictures differ only in where the light comes from. They are drawn by `scripts/make-gold-stars.py` (needs Python 3 with numpy and Pillow); if you change the point lengths there, change `STAR_ARMS` in `geometry.ts` to match.
