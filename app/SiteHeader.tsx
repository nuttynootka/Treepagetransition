"use client";

import { usePathname } from "next/navigation";
import { GarlandHeader, type GarlandPage } from "@/components/garland-header";
import { TransitionLink } from "@/components/tree-transition";

const pages: GarlandPage[] = [
  { href: "/", label: "Home" },
  {
    label: "Shop",
    items: [
      { href: "/statement-trees", label: "Statement Trees" },
      { href: "/wholesale-trees", label: "Wholesale Trees" },
      // Or "Wreaths & Boughs" if cut boughs are the only greenery you sell.
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

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <GarlandHeader
      pages={pages}
      activeHref={pathname}
      LinkComponent={TransitionLink}
      logoAlt="Noble Star Forest"
    />
  );
}
