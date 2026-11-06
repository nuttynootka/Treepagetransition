import type { ComponentType, MouseEventHandler, PointerEventHandler, ReactNode } from "react";

export interface GarlandPage {
  href: string;
  /** Shown on the snowflake's glass plate. Up to about 9 characters fits on one line. */
  label: string;
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
