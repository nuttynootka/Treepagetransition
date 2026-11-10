import type { ComponentType, MouseEventHandler, PointerEventHandler, ReactNode } from "react";

export interface GarlandLink {
  href: string;
  /** Shown on a frosted glass plate in the hanging menu. */
  label: string;
}

export interface GarlandPage {
  /** Shown on the tab's glass plate (in capitals). Every plate is as wide as the widest label. */
  label: string;
  /** Where the tab goes. Leave out when the tab opens a menu instead. */
  href?: string;
  /** Tapping the tab drops down these plates instead of going to a page. */
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
