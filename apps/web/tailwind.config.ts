import type { Config } from "tailwindcss";

/**
 * Design tokens mirror docs/01-design-system.md — one deliberate dark
 * theme built on the brand pair (near-black bg, red-orange accent).
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-raised": "hsl(var(--surface-raised) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          hover: "hsl(var(--brand-hover) / <alpha-value>)",
        },
        danger: "hsl(var(--brand) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        ink: {
          DEFAULT: "hsl(var(--text) / <alpha-value>)",
          muted: "hsl(var(--text-muted) / <alpha-value>)",
          faint: "hsl(var(--text-faint) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--brand) / 0.4), 0 8px 24px -8px hsl(var(--brand) / 0.5)",
      },
    },
  },
  plugins: [],
} satisfies Config;
