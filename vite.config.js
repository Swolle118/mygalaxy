import { defineConfig } from "vite";

// "./" makes every asset path relative, so the site works at
// https://<user>.github.io/<repo>/ without hardcoding the repo name.
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 1200 },
});
