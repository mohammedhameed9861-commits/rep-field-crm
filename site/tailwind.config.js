/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand purple (Flowercom primary)
        plum: {
          50: "#f6f1f9",
          100: "#ead9f0",
          200: "#d3b3e2",
          300: "#b88ccf",
          400: "#9a68b9",
          500: "#7d4c9e",
          600: "#623a7d",
          700: "#4f2f65",
          800: "#3c2450",
        },
        // Brand teal (accent / CTA)
        teal: {
          50: "#e7fbfa",
          100: "#c5f4f1",
          400: "#3fcdc4",
          500: "#22b5ac",
          600: "#188f88",
          700: "#146f6a",
        },
        // Brand cream (background)
        cream: {
          50: "#fffdf6",
          100: "#faf3d9",
          200: "#f2e6b8",
        },
      },
      fontFamily: {
        display: ["'Cinzel'", "serif"],
        sans: ["'Lato'", "ui-sans-serif", "system-ui", "sans-serif"],
        arabicDisplay: ["'Kaeeb Serif'", "serif"],
        arabicSans: ["'Tajawal'", "sans-serif"],
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(-14px, -18px) rotate(6deg)" },
        },
        driftReverse: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(16px, -12px) rotate(-8deg)" },
        },
        fall: {
          "0%": { transform: "translateY(-10%) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translateY(120%) rotate(40deg)", opacity: "0" },
        },
        fadeUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        drift: "drift 9s ease-in-out infinite",
        "drift-slow": "drift 14s ease-in-out infinite",
        "drift-reverse": "driftReverse 11s ease-in-out infinite",
        fall: "fall 16s linear infinite",
        "fade-up": "fadeUp 0.8s ease-out both",
      },
    },
  },
  plugins: [],
};
