# Design brief: build a website around the Noble Star Forest header

This brief is for a designer or design tool (such as Claude Design). It describes a finished header and what the rest of the site should be built around. **The header is done and should not be redesigned.** Design everything below it.

## The business

**Noble Star Forest**: Christmas trees, boughs, wreaths, and (per the logo) firewood. The logo is a carved wood sign with a white 8-point north star in the word "STAR" and small pine trees along the top edge.

## What you get

- **Live preview** (open it, tap Shop and Us): https://claude.ai/artifact/3aF7nmy1KHQnZRu9CGoS9a
- **Code:** GitHub repo `nuttynootka/Treepagetransition`, branch `ccr-ea065b50-smabkw` (https://github.com/nuttynootka/Treepagetransition/tree/ccr-ea065b50-smabkw). Header component: `components/garland-header/`. Working example: `app/SiteHeader.tsx` and `app/layout.tsx`. Behaviour and options: `README.md`.
- **Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS v4.

## The header, as built (do not change)

- **Garland:** painted noble fir (blue-green, silvery needles) and western red cedar (bright yellow-green flat sprays) across the full width at the top, with small white fairy lights that twinkle slowly and randomly.
- **Sign:** the logo, centred on the page and on the garland, so the garland runs behind it. Its star glows and twinkles.
- **Three tabs:** frosted glass plates (light, slightly warm white glass; silver bevel; words etched in dark) hanging on silver chains. Left, centre and right slots; the centre plate hangs just under the sign. Their positions never move. Only the word on each plate changes.
- **Dropdowns:** more glass plates on chains unroll from under the centre tab with physics (each plate swings and twists on its own), then roll back up behind it.
- **Size of the header:** 163px tall on phones (390px wide), about 200px at 820px, 239px at 1440px. Open dropdowns hang over the page below it and are not part of its height.
- **It is not sticky.** It scrolls away with the page. (A sticky version is possible if wanted; ask.)

### Navigation

Exactly three tabs and three words: **Shop, Home, Us**. At first open they read Shop (left), Home (centre), Us (right). The centre always shows the page being viewed.

| Tab | Page |
| --- | --- |
| Home | `/` (no dropdown) |
| Shop | Statement Trees `/statement-trees`, Wholesale Trees `/wholesale-trees`, Wreaths & Greenery `/wreaths-and-greenery`, Make Payment `/make-payment` |
| Us | Meet Us `/meet-us`, Contact Us `/contact-us`, Request Quote `/request-quote` |

Tapping a side tab swaps its word with the centre's (150ms fade out, 150ms fade in, nothing slides), then opens that page's dropdown from the centre. Picking a subpage keeps the swap, so that section's word stays in the centre. Tapping outside the dropdown closes it and fades the words back. Details are in `README.md` ("The tab-swap rules"). **Design pages knowing the centre tab will read "Shop" or "Us" while someone is on a Shop or Us subpage, and "Home" on the home page.**

## Look and feel to build around

- **Mood:** a candle-lit winter night at a family tree farm. Dark, warm, handmade, a little magical. Not corporate, not a generic e-commerce template.
- **Page background:** deep green-black. The header's backdrop fades from `#173a2b` (top) through `#0b1a14` to `#060c0a`. The demo page background is `#060c0a`.
- **Text:** warm off-white `#f3ede4`; muted text `#a9b5ad`; gold accent `#e9d7b0` (also used for the chain ribbons). Light colours in the header are warm white `#FFF5EB` and warm gold.
- **Fonts:** menu words in **Cuprum** (a narrow sans, uppercase, 12–14px). Page headings in **Cormorant Garamond** (600 weight). Body text is currently a plain system sans; a better pairing is welcome.
- **Wood and greenery:** the sign's honey-oak wood with dark carved lettering, and the garland's deep greens, are the strongest colours in the header. Warm tones that echo the wood (and photography of real trees) will sit well below it.
- **Glass:** light frosted glass with a silver bevel is the header's signature. If the site reuses it (buttons, cards, dialogs), keep it sparing so the header stays special.
- **Avoid:** busy backgrounds behind the open dropdown (it overlaps page content), more animated sparkle (the header has plenty), and any other bright colours of light. Lights are white and warm gold only.

## Practical constraints

- **Mobile first.** Most visitors are on phones. Layouts must work at 360px wide with no sideways scrolling. Keep a 16px side gutter.
- **Tap targets:** the header's plates are 26–28px tall (smaller than the usual 44px guideline). Make everything below it comfortably tappable.
- **Open dropdown:** up to 4 plates hang down the middle of the page, about 100–160px wide each (as wide as their words), starting about 12px below the centre tab and reaching about 150px below the bottom of the header. Content under it is covered while it is open, so don't put critical content in that band, centred under the header.
- **Reduced motion:** the header respects it. Do the same.
- **Page transition:** changing page plays a wand-tree animation (a wand draws a Christmas tree of white lights while the screen fades to black, about 2.2 seconds). It is in `components/tree-transition/`. Pages should work with a black screen swapping underneath them.

## Pages to design

1. **Home** `/` (the first impression; real calls to action: shop trees, request a quote)
2. **Statement Trees** `/statement-trees`
3. **Wholesale Trees** `/wholesale-trees` (for businesses; request-a-quote oriented)
4. **Wreaths & Greenery** `/wreaths-and-greenery`
5. **Make Payment** `/make-payment`
6. **Meet Us** `/meet-us`
7. **Contact Us** `/contact-us`
8. **Request Quote** `/request-quote` (a form)

Each is a placeholder in `app/` right now. I have not supplied product details, prices, photos, copy, or business facts (address, hours, phone), so use clearly marked placeholders and don't invent specifics.

## Not decided yet (ask before assuming)

- Whether Home has a hero image or video, and whether there are product photos.
- How payments work on **Make Payment** (the page is only a placeholder).
- Whether the site sells online or takes quotes and orders by form.
- Whether the header should become sticky.
