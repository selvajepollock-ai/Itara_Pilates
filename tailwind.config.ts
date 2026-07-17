import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        linen: "#FAF6F0",
        ink: "#2E2B26",
        moss: {
          DEFAULT: "#5B6E4F",
          dark: "#43533A",
          light: "#8B9C7E",
        },
        clay: "#C97F5A",
        blush: "#EFE1D6",
        sand: "#E4DACD",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
