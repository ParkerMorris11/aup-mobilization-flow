import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        salt: {
          DEFAULT: "#f6f4ed",
          dark: "#ebe8df",
        },
        alpine: {
          DEFAULT: "#23403b",
          light: "#2f524c",
          muted: "#3d635c",
        },
        gold: {
          DEFAULT: "#f1f14d",
          dark: "#dede3a",
        },
        slate: {
          850: "#1a2332",
        },
        uinta: "#43573d",
        arches: "#b47351",
        canyonlands: "#6c372e",
        wasatch: "#5a87c3",
        sage: "#a2a882",
        decision: {
          allowed: "#2d6a4f",
          caution: "#b8860b",
          prohibited: "#9b2c2c",
          escalate: "#2c5282",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(35, 64, 59, 0.08), 0 4px 12px rgba(35, 64, 59, 0.06)",
        "card-lg": "0 8px 24px rgba(35, 64, 59, 0.1), 0 2px 8px rgba(35, 64, 59, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
