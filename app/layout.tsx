import type { Metadata, Viewport } from "next";
import { TreeTransitionProvider } from "@/components/tree-transition";
import { Nav } from "./Nav";
import "./globals.css";

export const metadata: Metadata = { title: "Tree Transition Demo" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TreeTransitionProvider>
          <Nav />
          {children}
        </TreeTransitionProvider>
      </body>
    </html>
  );
}
