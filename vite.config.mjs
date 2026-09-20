import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        statistics: resolve(import.meta.dirname, "statistics.html"),
        releaseNotes: resolve(import.meta.dirname, "release-notes.html"),
        about: resolve(import.meta.dirname, "about.html"),
      },
    },
  },
});
