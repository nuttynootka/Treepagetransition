"use client";

import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/tree-transition";

const links = [
  { href: "/", label: "Home" },
  { href: "/workshop", label: "Workshop" },
  { href: "/letters", label: "Letters" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav>
      {links.map((l) => (
        <TransitionLink key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </TransitionLink>
      ))}
    </nav>
  );
}
