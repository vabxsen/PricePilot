import type { Config } from "tailwindcss";

/**
 * Design tokens mirror docs/01-design-system.md.
 * Colors are exposed as CSS variables (see src/index.css) so the same
 * palette can be shared with emails and the browser extension later.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand-primary) / <alpha-value>)",
          accent: "hsl(var(--brand-accent) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
