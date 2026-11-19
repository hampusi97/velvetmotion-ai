import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05050a",
          900: "#0c0c16",
          800: "#141424",
          700: "#24243a",
        },
        vm: {
          bg: "#05050a",
          pink: "#ff1e8e",
          magenta: "#ff4dff",
          cyan: "#00f5ff",
          violet: "#a855f7",
          emerald: "#00ffa3",
          text: "#f7f7fc",
          muted: "#a6a6c4",
        },
        rose: {
          100: "#fde7ef",
          200: "#f8c9d8",
          300: "#f0a9c2",
          400: "#e07aa0",
          500: "#ff1e8e",
          600: "#d61576",
          700: "#9a234f",
        },
        cream: "#f7f7fc",
        mist: "#a6a6c4",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px -28px rgba(0, 0, 0, 0.85)",
        neonPink: "0 0 12px rgba(255, 30, 142, 0.78), 0 0 32px rgba(255, 30, 142, 0.35)",
        neonCyan: "0 0 12px rgba(0, 245, 255, 0.72), 0 0 28px rgba(0, 245, 255, 0.30)",
        neonViolet: "0 0 12px rgba(168, 85, 247, 0.72), 0 0 28px rgba(168, 85, 247, 0.30)",
      },
    },
  },
  plugins: [],
};

export default config;
