// The Noble Star Forest sign: its image, width-to-height ratio, and where the
// 8-point star in "STAR" sits, so it can glow and twinkle.

/** Where a logo's star is, in percent of the logo box. */
export interface LogoStar {
  /** The cut-out star image, drawn over the logo's own star. */
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Where the star's rays meet, in percent of the star image. */
  cx: number;
  cy: number;
}

export const NOBLE_STAR_LOGO = {
  src: "/brand/noble-star-forest.webp",
  ratio: 1.8349,
  star: {
    src: "/brand/noble-star.webp",
    left: 70.3,
    top: 25.32,
    width: 8.5,
    height: 26.79,
    cx: 50.6,
    cy: 40.4,
  } satisfies LogoStar,
};
