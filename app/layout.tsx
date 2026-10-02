// Built for Sarah.

import "./globals.css";
import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import { BusinessProvider } from "@/lib/BusinessContext";
import { barlowCondensed, inter, spaceGrotesk, sora } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Luupa — Bahrain's trusted car care directory",
  description: "Bahrain's curated directory for car care & customization businesses.",
};

export const viewport: Viewport = {
  themeColor: "#0F3D2E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} ${spaceGrotesk.variable} ${sora.variable}`}
    >
      <body>
        <BusinessProvider>
          <Navbar />
          <main>{children}</main>
          <ConditionalFooter />
        </BusinessProvider>
      </body>
    </html>
  );
}
