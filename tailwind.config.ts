import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-space)",
          "system-ui",
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          "Meiryo",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // エレクトリックブルーのアクセント（白文字が乗る前提）。
        brand: {
          50: "#eef1ff",
          100: "#dee4ff",
          200: "#c3ccff",
          300: "#9aaaff",
          400: "#6c82ff",
          500: "#3d5aff",
          600: "#2f4bff",
          700: "#1f37e6",
          800: "#1a2bb4",
          900: "#1b2a8f",
        },
        // クールなインクのニュートラル（slate を上書き）。
        slate: {
          50: "#f7f7f8",
          100: "#ededf1",
          200: "#d8d8df",
          300: "#b7b7c2",
          400: "#85858f",
          500: "#65656f",
          600: "#46464e",
          700: "#2a2a31",
          800: "#17171c",
          900: "#0d0d11",
          950: "#070709",
        },
      },
    },
  },
  plugins: [],
};

export default config;
