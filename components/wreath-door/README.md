# Wreath door product preview (React + TypeScript + Tailwind + Framer Motion)

A product preview for a wreath shop. Shoppers click a wreath and see it on a dark charcoal front door:

1. The door swings inward on its hinge (real 3D), showing a warm, soft-focus room inside.
2. It shuts quickly. As it closes, the chosen wreath is now hanging on a matte black hanger.
3. When the door hits the frame, the wreath swings side to side, knocks against the door and bounces on its hook (Framer Motion springs), then settles.

This is separate from the tree page transition in this repo. It does not use or change it.

- **Desktop (768px wide and up):** the door is always on screen beside the product grid. Clicking another wreath swings the door open with the current wreath still on it, shuts it, and settles with the new one.
- **Phones (under 768px):** tapping a card grows a full-screen preview out of that card, then plays the door sequence. Close it with the **X** button, the **Escape** key, or the phone's **back button / back swipe**.
- **Extras (each can be turned off):** firelight that spills out of the doorway onto the step and the page around it, a wreath shadow that moves as it sways, light snow, and an up/down porch light that warms up when the wreath settles.
- **Reduced motion:** if the visitor has "reduce motion" turned on, the door does not swing and there is no snow. The wreath simply fades from one to the next.

**Preview it:** open `preview/door/wreath-door-preview.html` in any browser (double-click it), or run the demo site and go to `/door`.

---

## Files

| Path | What it is |
| --- | --- |
| `components/wreath-door/WreathDoorStorefront.tsx` | The whole thing: product grid + door (desktop) or full-screen preview (phone). Most sites only need this. |
| `components/wreath-door/DoorScene.tsx` | The door, wall, porch light, wreath physics and the open/shut sequence. Timing and spring settings are at the top. |
| `components/wreath-door/MobilePreviewDialog.tsx` | The phone full-screen preview (`role="dialog"`), with the back-button support. |
| `components/wreath-door/InteriorView.tsx` | The room seen through the door (your photo, blurred, with flickering firelight). |
| `components/wreath-door/ProductCard.tsx`, `ProductDetails.tsx` | Product tile and the title/price/description panel. |
| `components/wreath-door/Snowfall.tsx` | The snow (one canvas; pauses when off screen). |
| `components/wreath-door/types.ts` | TypeScript types for products and options. |
| `components/wreath-door/demoProducts.ts` | The 4 demo products. Replace with your own. |
| `public/wreath-door/placeholder-*.svg` | Drawn placeholder wreaths. Replace with your photos. |
| `app/door/` | Demo page at `/door` in the Next.js demo site. |
| `preview/door/` | Builds the single-file preview page. |

---

## Adding your own photos

### What photos work best

- **Wreaths:** a **cut-out with a transparent background**, saved as **PNG or WebP**, roughly square, about **1200 × 1200 px**. The transparent background matters: the door and the moving shadow are made from the wreath's outline. A photo with a white background will show as a white square on the door.
  - Ways to cut out a wreath (checked November 2026):
    - **remove.bg**: open https://www.remove.bg/upload, upload the photo, then download the result. Its site says the standalone website "will no longer be available from 1 December 2026" (it is moving into Canva).
    - **Canva** (paid plans only; Canva's help page says Background Remover "is included with paid plans"): open the photo in a design, select it, choose **BG Remover** in the editor toolbar, then download as **PNG** with a transparent background.
    - Or send me the photos (Option A below) and ask me to try removing the backgrounds.
  - You can also give each product a separate, normal photo for its card (`cardImage`, see below).
- **Interior (the room behind the door):** any landscape or portrait **JPG**, about **1600 px** on the long side. It is shown slightly blurred and cropped to the doorway, so the important part (tree, fireplace) should be near the middle. Only use a photo you own or have the rights to.

### Option A: send them to me in this chat
Attach the files to your next message in the Claude app (tap the **+** or paperclip, choose the photos), and tell me which photo is which product. I'll add them, rebuild the preview, and push.

### Option B: add them yourself
1. Put the files in the folder `public/wreath-door/` (for example `public/wreath-door/noble-fir.png` and `public/wreath-door/interior.jpg`).
2. Open `components/wreath-door/demoProducts.ts`. For each product, change the file name inside `imageUrl("...")` to your file's name, and update `title`, `price`, `description` and `alt` (a short description of the wreath for blind visitors).
3. **Hook position:** `hangPoint` is where the hook catches the wreath, as a fraction of the image height from the top. For a tightly cropped cut-out, use about `0.03`. If the wreath looks like it floats below the hook, make the number bigger; if the hook pokes into the wreath, make it smaller.
4. Open `app/door/DoorDemo.tsx`, find the line `// interior={{ src: "/wreath-door/interior.jpg", position: "50% 60%" }}`, and delete the `// ` at the start so it is active. `position` moves the crop: `"50% 50%"` is the centre; a bigger second number shows more of the bottom of the photo.
5. Rebuild the single-file preview: in a terminal in the project folder, run `npm run build:door-preview`. (The single-file preview embeds the four placeholder wreaths directly; to change which files it embeds, edit the `import` lines at the top of `preview/door/door-preview-app.tsx`.)

---

## Use it in your own store

### Requirements
- **React 18 or 19** and **TypeScript**.
- **Framer Motion** (tested with `framer-motion` 14.6.0).
- **Tailwind CSS v4** (tested with 4.3.3).
- Works with Next.js (App Router) and with any other React setup. It does not use `next/image` or the Next.js router.

### Step 1: Install the packages
1. Open a terminal in your project folder:
   - **Mac:** open the **Terminal** app, type `cd ` (with a space), drag your project folder into the window, press **Enter**.
   - **Windows:** open your project folder in File Explorer, click the address bar, type `cmd`, press **Enter**.
2. Type this and press **Enter**:

   ```bash
   npm install framer-motion@14.6.0
   ```

3. If your project does not use Tailwind yet, follow Tailwind's own install guide for your framework at https://tailwindcss.com/docs/installation (pick your framework from the list on that page).

### Step 2: Copy the folder
Copy the whole `components/wreath-door` folder from this repo into your project's components folder (usually `components/` or `src/components/`).

### Step 3: Tell Tailwind to scan it
Open your main CSS file (the one that contains `@import "tailwindcss";`) and add one line under that import, pointing at the copied folder. The path is relative to the CSS file:

```css
@import "tailwindcss";
@source "../components/wreath-door";
```

### Step 4: Use it on a page
In Next.js App Router the page that uses it must be a client component, or import it from one. Create a file, for example `app/wreaths/WreathPreview.tsx`:

```tsx
"use client";

import { WreathDoorStorefront, type WreathProduct } from "@/components/wreath-door";

const products: WreathProduct[] = [
  {
    id: "noble-fir",
    title: "Noble Fir & Winterberry",
    price: 168,
    currency: "USD",
    description: "Hand-tied noble fir with red winterberry and a velvet bow.",
    image: { src: "/wreaths/noble-fir.png", alt: "Fir wreath with red berries and a red bow", hangPoint: 0.03 },
    // Optional: a different photo for the product card.
    cardImage: { src: "/wreaths/noble-fir-styled.jpg", alt: "Noble fir wreath on a table" },
  },
  // ...more products
];

export function WreathPreview() {
  return (
    <WreathDoorStorefront
      products={products}
      interior={{ src: "/wreaths/interior.jpg", position: "50% 60%" }}
      onAddToCart={(product) => {
        // call your cart here
      }}
    />
  );
}
```

Then use `<WreathPreview />` in your page file.

### Options

| Prop | What it does |
| --- | --- |
| `products` | Your wreaths (required). |
| `interior` | `{ src, position? }`: the room photo. Without it a simple blurred stand-in room is shown. |
| `effects` | Turn extras off, e.g. `effects={{ snow: false, firelight: true, wreathShadow: true, porchLight: true }}`. |
| `initialProductId` | Desktop only: hang this wreath when the page loads (plays the sequence once). |
| `onAddToCart` | Shows an "Add to cart" button under the preview and calls this when pressed. |
| `listLabel` | Name of the product list for screen readers (default "Wreaths"). |

Want the door on its own, without the grid? Use `<DoorScene selection={{ product, nonce }} />` and change `nonce` (any new number) every time the shopper picks a wreath.

### Changing timing and physics
At the top of `DoorScene.tsx`:
- `DOOR_TIMING`: `openAngle` (degrees), `open`, `hold` and `close` (seconds).
- `SPRINGS`: `sway` (side to side), `tilt` (swinging off the door and knocking back), `bounce` (up and down on the hook). Lower `damping` = swings longer. Higher `stiffness` = faster swings.

---

## How it works

- **3D door:** the stage has CSS `perspective`; the door rotates with `rotateY` around its left edge (`transform-origin: 0% 50%`) inside a `transform-style: preserve-3d` layer, so the wreath turns with the door in true 3D.
- **Smooth animation:** every moving value (door angle, sway, tilt, bounce, light levels) is a Framer Motion `MotionValue`. They update the page directly without re-rendering React, and only `transform` and `opacity` change per frame.
- **Wreath physics:** the wreath is treated as a pendulum hanging from the hook. When the door stops dead, the wreath gets a push: it sways side to side (`rotate`), swings out from the door and back (`rotateX`), and jolts on the hook (`y`). The door acts as a wall: the swing-out value is mirrored at zero, so the wreath bounces off the door face and each bounce is smaller, the way a real one knocks and settles.
- **Swapping wreaths:** the next wreath's image is loaded in the background while the door opens, and swapped at the moment the door face is turned furthest away, so the switch is never seen.
- **Phone back button:** opening the preview adds one entry to the browser history. The back button removes it and closes the preview instead of leaving the page. Closing with X or Escape removes the entry too, so the history stays clean.
- **Accessibility:** cards are real buttons with `aria-pressed` (desktop) or `aria-haspopup="dialog"` + `aria-expanded` (phone). The phone preview is a `role="dialog"` with `aria-modal`, a labelled close button, focus moved into it and kept inside it, the page behind it made `inert`, and focus returned to the card on close. The door has a text description, and a screen-reader announcement says which wreath is now on the door.
