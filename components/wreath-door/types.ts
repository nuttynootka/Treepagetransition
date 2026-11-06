export interface WreathImage {
  /** URL of the image. For the door, use a cut-out with a transparent background (PNG, WebP or SVG). */
  src: string;
  /** Describes the wreath for screen readers. */
  alt: string;
  /**
   * Where the hook catches the wreath, as a fraction of the image height from
   * the top (0 = top edge). Use about 0.03 for a tightly cropped cut-out.
   * Default 0.04.
   */
  hangPoint?: number;
}

export interface WreathProduct {
  id: string;
  title: string;
  /** Price in major units, e.g. 148 or 148.5. */
  price: number;
  /** ISO 4217 currency code. Defaults to "USD". */
  currency?: string;
  description: string;
  /** High-res transparent cut-out. This is what hangs on the door. */
  image: WreathImage;
  /** Optional photo for the product card (e.g. a styled shot with a background). Falls back to `image`. */
  cardImage?: WreathImage;
}

/**
 * What the door should show. `nonce` changes on every click, so clicking the
 * product that is already hanging still gets a response (a small wiggle).
 */
export interface DoorSelection {
  product: WreathProduct;
  nonce: number;
}

export type DoorPhase = "idle" | "opening" | "holding" | "closing" | "settling" | "settled";

export interface DoorEffects {
  /** Warm light floods out of the doorway while the door is open. Default true. */
  firelight?: boolean;
  /** The wreath casts a shadow on the door that moves as it sways. Default true. */
  wreathShadow?: boolean;
  /** Light snow in front of the door. Default true. */
  snow?: boolean;
  /** Up/down wall light that warms up when the wreath settles. Default true. */
  porchLight?: boolean;
}

export interface InteriorImage {
  /** Photo of the room seen through the open door. It is shown soft-focus. */
  src: string;
  /** Where the photo is anchored when cropped, as CSS object-position. Default "50% 50%". */
  position?: string;
}
