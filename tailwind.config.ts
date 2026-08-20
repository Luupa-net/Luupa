import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "#14171C",
          light: "#1B1F26",
          lighter: "#232832",
        },
        titanium: {
          DEFAULT: "#C9CDD3",
          dim: "#8A8F98",
        },
        ignition: {
          DEFAULT: "#E2703A",
          light: "#F08B58",
          dim: "#B85A2C",
        },
        steel: {
          DEFAULT: "#3B4B5C",
          light: "#4E6070",
        },
        canvas: "#F7F6F3",
        ink: "#14171C",
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
