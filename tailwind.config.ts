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
          soft: "#F4F8F4",
        },
        clay: "#C17A5D",
        blush: "#EFE1D6",
        sand: "#E8E6E1",
        // Rediseno de Inicio: tokens que el proyecto no tenia (bordes, estados).
        edge: { DEFAULT: "#EEE8DF", strong: "#E2D9CC", divider: "#F0EAE1" },
        muted: "#6B6459",
        danger: { DEFAULT: "#A1432C", soft: "#F3DCD3", ink: "#8E3A24" },
        warning: { soft: "#F6EDDA", ink: "#8A5A12" },
        info: { soft: "#E2ECF5", ink: "#255377" },
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
