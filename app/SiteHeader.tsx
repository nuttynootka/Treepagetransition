"use client";

import { usePathname } from "next/navigation";
import { GarlandHeader, type GarlandPage } from "@/components/garland-header";
import { TransitionLink } from "@/components/tree-transition";

const pages: GarlandPage[] = [
  { href: "/trees", label: "TREES" },
  { href: "/firewood", label: "FIREWOOD" },
  { href: "/wreaths", label: "WREATHS" },
  { href: "/greenery", label: "GREENERY" },
  { href: "/about", label: "ABOUT" },
  { href: "/contact", label: "CONTACT" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <GarlandHeader
      pages={pages}
      activeHref={pathname}
      LinkComponent={TransitionLink}
      logoAlt="Company logo"
    />
  );
}
