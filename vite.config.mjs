import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        monopolyDeal: resolve(import.meta.dirname, "games/monopoly-deal/index.html"),
        gameGuides: resolve(import.meta.dirname, "game-guides.html"),
        home: resolve(import.meta.dirname, "index.html"),
        statistics: resolve(import.meta.dirname, "statistics.html"),
        releaseNotes: resolve(import.meta.dirname, "release-notes.html"),
        about: resolve(import.meta.dirname, "about.html"),
      },
    },
  },
});
