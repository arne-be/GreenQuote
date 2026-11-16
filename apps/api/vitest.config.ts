import { containerTestTimeouts } from "@greenquote/config/vitest";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC instead of esbuild: Nest's dependency injection needs emitted decorator metadata.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    ...containerTestTimeouts,
    env: {
      DATABASE_URL:
        "postgres://greenquote:greenquote@localhost:5432/greenquote",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters",
    },
  },
});
