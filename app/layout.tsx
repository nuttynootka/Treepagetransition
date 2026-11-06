import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { TreeTransitionProvider } from "@/components/tree-transition";
import { SiteHeader } from "./SiteHeader";
import "./globals.css";

// Used by the snowflake labels (via --font-cormorant) and page headings.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = { title: "Garland Header Demo" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#060c0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cormorant.variable}>
      <body>
        <TreeTransitionProvider>
          <SiteHeader />
          {children}
        </TreeTransitionProvider>
      </body>
    </html>
  );
}
