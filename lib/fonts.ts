// Self-hosted via next/font instead of a <link> to fonts.googleapis.com —
// eliminates two render-blocking round trips (the CSS file, then the font
// files themselves) on every single page load. next/font downloads these at
// BUILD time and serves them from this app's own origin, with font-display
// and size-adjust metrics applied automatically to avoid layout shift.
// Each export's `.variable` is a CSS custom property wired into
// tailwind.config.ts's fontFamily, so existing font-display/font-body/
// font-displayAlt/font-bodyAlt utility classes keep working unchanged.
import { Barlow_Condensed, Inter, Space_Grotesk, Sora } from "next/font/google";

export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});
