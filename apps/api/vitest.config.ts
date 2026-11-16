import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC instead of esbuild: Nest's dependency injection needs emitted decorator metadata.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    // Postgres runs in testcontainers, and turbo tests packages in parallel; 5 s is too tight on CI.
    testTimeout: 30_000,
    env: {
      DATABASE_URL:
        "postgres://greenquote:greenquote@localhost:5432/greenquote",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters",
    },
  },
});
