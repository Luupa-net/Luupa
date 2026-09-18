import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FFFFFF",
        canvas2: "#F7F6F3",
        ink: "#14181F",
        // Navy: the primary brand color — modern, trustworthy, premium. Used generously.
        navy: {
          DEFAULT: "#152A4E",
          light: "#1F3A66",
          dim: "#0D1B33",
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
        // Homepage refresh only — a brighter accent pair, used alongside navy/ink,
        // not a replacement for terra/navy elsewhere in the app.
        coral: {
          DEFAULT: "#A32CC4",
          dim: "#8B25A7",
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
