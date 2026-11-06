"use client";

import { usePathname } from "next/navigation";
import { GarlandHeader, type GarlandPage } from "@/components/garland-header";
import { TransitionLink } from "@/components/tree-transition";

const pages: GarlandPage[] = [
  { href: "/", label: "Home" },
  { href: "/workshop", label: "Workshop" },
  { href: "/letters", label: "Letters" },
  { href: "/gifts", label: "Gifts" },
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
