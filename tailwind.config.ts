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
        edge: { DEFAULT: "#EEE8DF", strong: "#E2D9CC", divider: "#F0EAE1", head: "#FAF8F5", row: "#F3EEE6" },
        // Estados de cuota (punto + texto), rediseno de Alumnos.
        state: {
          ok: "#3E8A52", "ok-ink": "#2F6B3E",
          soon: "#2F6F9F", "soon-ink": "#255377",
          due: "#C8692E", "due-ink": "#9A4A1E",
          surcharge: "#B5523B", "surcharge-ink": "#8E3A24",
          none: "#C9962E", "none-ink": "#8A5A12",
          free: "#A39C90", "free-ink": "#5E584F",
        },
        alert: { soft: "#FBF1EA", edge: "#F1DCCD" },
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
