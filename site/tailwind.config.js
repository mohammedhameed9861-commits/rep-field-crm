/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bloom: {
          50: "#fdf2f6",
          100: "#fce7ee",
          200: "#fbcfe0",
          400: "#f472a0",
          500: "#e8447c",
          600: "#c92a61",
          700: "#a51f4d",
        },
        leaf: {
          50: "#f1f8f2",
          100: "#dcedde",
          400: "#5c9e66",
          500: "#3f7d49",
          600: "#2f6238",
          700: "#264f2d",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
      },
    },
  },
  plugins: [],
};
