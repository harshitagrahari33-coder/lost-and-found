import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#234C3B",
          hover: "#1B3C2E",
          light: "#2D614B",
          dark: "#163126",
        },
        sage: {
          DEFAULT: "#829A87",
          light: "#A3B7A7",
          subtle: "#E6ECE8",
          dark: "#657C6A",
        },
        cream: {
          DEFAULT: "#F5F1E8",
          surface: "#FFFDF8",
          dark: "#ECE6D9",
          card: "#FEFCF6",
        },
        ink: {
          DEFAULT: "#17201B",
          muted: "#69736D",
          light: "#97A19B",
        },
        borderWarm: {
          DEFAULT: "#E2DED4",
          light: "#ECE8DF",
          dark: "#D5D0C4",
        },
        lostCoral: {
          DEFAULT: "#E56B67",
          surface: "#FDF4F4",
          border: "#F7CDCC",
          text: "#B84743",
        },
        foundGreen: {
          DEFAULT: "#5C9B78",
          surface: "#F0F7F3",
          border: "#C7E3D3",
          text: "#3A7253",
        },
        accentGold: {
          DEFAULT: "#D7A94B",
          surface: "#FDF9EE",
          border: "#F2DEC4",
          dark: "#B88A2D",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"],
        serif: ['"Newsreader"', "Georgia", "serif"],
      },
      boxShadow: {
        subtle: "0 2px 8px -2px rgba(23, 32, 27, 0.05), 0 1px 4px -1px rgba(23, 32, 27, 0.03)",
        card: "0 4px 20px -4px rgba(35, 76, 59, 0.08), 0 2px 6px -2px rgba(23, 32, 27, 0.04)",
        cardHover: "0 12px 32px -6px rgba(35, 76, 59, 0.14), 0 4px 12px -2px rgba(23, 32, 27, 0.06)",
        float: "0 20px 40px -12px rgba(35, 76, 59, 0.18)",
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
