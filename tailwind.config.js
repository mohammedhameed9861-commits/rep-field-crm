/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Same Flowercom brand family as the marketing site (kept in sync by eye,
        // not shared code — this repo never imports from flowercomsite).
        sea: {
          50: "#eefbfa",
          100: "#d3f3f0",
          200: "#a8e6e1",
          300: "#6fd2cb",
          400: "#3fbdb5",
          500: "#22a49c",
          600: "#17827c",
          700: "#106460",
          800: "#0b4c49",
        },
        teal: {
          50: "#e7fbfa",
          100: "#c5f4f1",
          400: "#3fcdc4",
          500: "#22b5ac",
          600: "#188f88",
          700: "#146f6a",
        },
        cream: {
          50: "#fffdf6",
          100: "#faf3d9",
          200: "#f2e6b8",
        },
        plum: {
          50: "#f6f2fa",
          100: "#e9dff2",
          400: "#9c6cbf",
          500: "#7e4fa3",
        },
        warn: {
          50: "#fdf7ef",
          100: "#fdf1e7",
          600: "#b8551f",
        },
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        arabic: ["'Cairo'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
