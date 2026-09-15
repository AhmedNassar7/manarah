import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Repo is "manarah", served at https://<user>.github.io/manarah/ — if a
  // custom domain is added later (via apps/web/public/CNAME), switch this
  // back to "/".
  base: "/manarah/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Registered manually in main.tsx instead, so we can poll for updates
      // on an interval — see the comment there for why.
      injectRegister: false,
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Manarah",
        short_name: "Manarah",
        description:
          "Prayer times, azkar, Quran reading/audio/tafsir, radio, and Qibla — offline-first.",
        theme_color: "#1f6f5c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/manarah/",
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
