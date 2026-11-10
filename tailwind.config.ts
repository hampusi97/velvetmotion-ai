import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07060a",
          900: "#120e16",
          800: "#1c1622",
          700: "#2c2433",
        },
        rose: {
          100: "#fde7ef",
          200: "#f8c9d8",
          300: "#f0a9c2",
          400: "#e07aa0",
          500: "#b12b5e",
          600: "#9a234f",
          700: "#7c1b40",
        },
        cream: "#f6efe9",
        mist: "#d2c4cb",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px -28px rgba(0, 0, 0, 0.85)",
      },
    },
  },
  plugins: [],
};

export default config;
