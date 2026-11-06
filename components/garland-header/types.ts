import type { ComponentType, MouseEventHandler, PointerEventHandler, ReactNode } from "react";

export interface GarlandLink {
  href: string;
  /** Shown on a frosted glass plate in the hanging menu. */
  label: string;
}

export interface GarlandPage {
  /** Shown on the snowflake's glass plate (in capitals). Keep it short: the longest label sets the size for all. */
  label: string;
  /** Where the snowflake links to. Leave out when the snowflake opens a menu instead. */
  href?: string;
  /** Tapping the snowflake drops down these plates instead of going to a page. */
  items?: GarlandLink[];
}

/** Props the header passes to your link component (next/link, TransitionLink, or a plain <a>). */
export interface LinkLikeProps {
  href: string;
  className?: string;
  children?: ReactNode;
  "aria-current"?: "page" | undefined;
  "aria-label"?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onPointerDown?: PointerEventHandler<HTMLAnchorElement>;
  onPointerEnter?: PointerEventHandler<HTMLAnchorElement>;
}

export type LinkLike = ComponentType<LinkLikeProps>;

/** A crystal snowflake picture: a square image with a transparent background, centred on its glass plate. */
export interface CrystalImage {
  src: string;
  /** Width of the glass plate (inside its silver rim) as a share of the image width, 0–1. */
  plate: number;
}
