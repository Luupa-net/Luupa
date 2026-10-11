// Built for Sarah.

import "./globals.css";
import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import ReturnToRedirector from "@/components/ReturnToRedirector";
import { BookingAlertsProvider } from "@/lib/BookingAlertsContext";
import { BookingAlertToasts } from "@/components/BookingAlerts";
import { BusinessProvider } from "@/lib/BusinessContext";
import { barlowCondensed, inter, spaceGrotesk, sora } from "@/lib/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://luupa.net"),
  title: "Luupa — Bahrain's trusted car care directory",
  description: "Find and book Bahrain's best detailing, tinting, ceramic coating and car care businesses — real prices, real reviews.",
  openGraph: {
    title: "Luupa — Bahrain's trusted car care directory",
    description: "Find and book Bahrain's best detailing, tinting, ceramic coating and car care businesses — real prices, real reviews.",
    siteName: "Luupa",
    type: "website",
    locale: "en_BH",
  },
  twitter: { card: "summary" },
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
          <BookingAlertsProvider>
            <ReturnToRedirector />
            <Navbar />
            <BookingAlertToasts />
            <main>{children}</main>
            <ConditionalFooter />
          </BookingAlertsProvider>
        </BusinessProvider>
      </body>
    </html>
  );
}
