import { defineConfig, devices } from "@playwright/test";

// The admin test signs in with SEED_ADMIN_PASSWORD from the root .env.
process.loadEnvFile(new URL("../../.env", import.meta.url));

// Runs against a stack that is already up (docker compose or pnpm dev); see the README.
export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
