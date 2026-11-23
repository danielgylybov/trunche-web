import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./client", import.meta.url)),
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "^/api/": "http://127.0.0.1:8787",
      "^/media/": "http://127.0.0.1:8787",
    },
  },
});
