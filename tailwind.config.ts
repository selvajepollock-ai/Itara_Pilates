import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        linen: "#FFFFFF",
        ink: "#2B2B28",
        moss: {
          DEFAULT: "#5B7561",
          dark: "#43533A",
          light: "#8B9C7E",
        },
        clay: "#C17A5D",
        blush: "#EFE1D6",
        sand: "#E8E6E1",
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
