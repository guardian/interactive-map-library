import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

// The preview app lives in this directory, so Vite's root is `app/`. The app
// imports basemaps and reference styles from `../src` and `../res`, so the dev
// server needs read access to the whole project, and the production build lands
// in the project-level `dist/`.
const projectRoot = fileURLToPath(new URL("..", import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    outDir: fileURLToPath(new URL("../dist", import.meta.url)),
    emptyOutDir: true,
  },
})
