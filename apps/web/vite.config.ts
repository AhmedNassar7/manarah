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
        // TODO(bundle-splitting): the default 2 MiB limit is now too small
        // because Quran text, azkar, and the cities dataset are all bundled
        // eagerly into the main chunk (~3.2MB as of the cities addition).
        // Raising this unblocks the build today, but the real fix is code
        // -splitting those datasets behind dynamic import() / package
        // subpath exports so they load on demand instead of on every visit
        // — needed before Phase 2 adds tafsir/hadith/more reciters on top.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
