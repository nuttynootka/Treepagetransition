import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Yanone_Kaffeesatz } from "next/font/google";
import { TreeTransitionProvider } from "@/components/tree-transition";
import { SiteHeader } from "./SiteHeader";
import "./globals.css";

// Page headings.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

// The menu words on the stars and hanging plates (via --font-yanone).
const yanone = Yanone_Kaffeesatz({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-yanone",
  display: "swap",
});

export const metadata: Metadata = { title: "Noble Star Forest" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#060c0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${yanone.variable}`}>
      <body>
        <TreeTransitionProvider>
          <SiteHeader />
          {children}
        </TreeTransitionProvider>
      </body>
    </html>
  );
}
