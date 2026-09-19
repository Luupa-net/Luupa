import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FFFFFF",
        canvas2: "#F7F6F3",
        ink: "#14181F",
        // Racing green: the primary brand color — deep, automotive, premium.
        // Chosen over navy to give Luupa a distinct identity in a market where
        // competitors already own red (Dubizzle) and blue (most GCC tech/fintech).
        // Kept under the "navy" token name since it fills the same role
        // everywhere (primary buttons, headings, dashboard chrome) — only the
        // hue changed, not what it's used for.
        navy: {
          DEFAULT: "#0F3D2E",
          light: "#1B5745",
          dim: "#06251C",
        },
        // Terracotta: sparse accent, only for key actions — never a full section wash.
        terra: {
          DEFAULT: "#C4633B",
          light: "#D67C52",
          dim: "#A3512E",
        },
        stone: {
          DEFAULT: "#6B7280",
          dim: "#9CA3AF",
          line: "#E7E5E0",
        },
        graphite: "#14181F",
        // Bright accent green — the "racing green" family's lighter half.
        // Deliberately Tailwind's emerald-600, not a neon/lime green: it holds
        // WCAG AA contrast as small text on white (nav logo, links) without
        // being harsh on the eyes next to a white background.
        teal: {
          DEFAULT: "#059669",
          dim: "#047857",
        },
        skyblue: {
          DEFAULT: "#2D6CDF",
          dim: "#1F56B8",
        },
        cream: "#FFFDF8",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        // Homepage refresh only
        displayAlt: ["'Space Grotesk'", "sans-serif"],
        bodyAlt: ["'Sora'", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
