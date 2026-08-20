import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm, light base — feels alive and inviting, not corporate/techy
        canvas: "#FCF9F4",
        canvas2: "#F5EFE4",
        ink: "#241F1A",
        // Coral-orange: proven top performer for urgency/excitement in CTAs
        coral: {
          DEFAULT: "#FF5A36",
          light: "#FF7A5C",
          dim: "#E44A28",
        },
        // Deep teal: balances the energy with trust/credibility (verified badges, checks)
        teal: {
          DEFAULT: "#0E6E64",
          light: "#12897C",
          dim: "#0A4F48",
        },
        // Warm neutral grays for secondary text/borders
        stone: {
          DEFAULT: "#7A7268",
          dim: "#A79E92",
          line: "#E8E0D3",
        },
        // Small dark section (nav on mobile menu open, footer) — used sparingly, not dominant
        graphite: "#241F1A",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
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
