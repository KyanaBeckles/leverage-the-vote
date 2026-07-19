import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal standalone config for `npm test` — deliberately does not reuse
// vite.config.js, since that pulls in @base44/vite-plugin (dev-server/env
// wiring not needed for pure-function tests) and would slow test startup.
// It reuses the same "@/*" -> "src/*" alias defined in jsconfig.json.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    environment: "node",
  },
});
