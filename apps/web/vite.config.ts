import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PricePilot",
        short_name: "PricePilot",
        description: "Track any product's price across the web and get alerted when it drops.",
        theme_color: "#020202",
        background_color: "#020202",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/logo.png", sizes: "1254x1254", type: "image/png", purpose: "any" },
          // Separate, more conservatively-padded crop: Android's adaptive-icon
          // masking only guarantees a centered safe-zone circle at 40% of the
          // icon's width, and can clip anything closer to the edge than that
          // (depending on the launcher's exact mask shape). Reusing the
          // tightly-cropped "any" artwork here left only ~2% of margin to
          // spare, which the home-screen icon actually clipped in practice.
          { src: "/logo-maskable.png", sizes: "1254x1254", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5173 },
});
