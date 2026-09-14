import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // TODO: set to "/<repo-name>/" if deploying to a GitHub Pages project site
  // instead of a custom domain or a user/org root site.
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Manarah",
        short_name: "Manarah",
        description:
          "Prayer times, azkar, Quran reading/audio/tafsir, radio, and Qibla — offline-first.",
        theme_color: "#1f6f5c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // App shell + bundled assets are precached; Quran text/audio caching
        // strategies are added once the quran-data fetch layer exists.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
