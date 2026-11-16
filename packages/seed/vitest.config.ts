import { defineConfig } from "vitest/config";

// Postgres runs in testcontainers, and turbo tests packages in parallel; 5 s is too tight on CI.
export default defineConfig({ test: { testTimeout: 30_000 } });
