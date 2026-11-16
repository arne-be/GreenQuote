// Postgres runs in testcontainers, and turbo tests packages in parallel; 5 s is too tight on CI.
export const containerTestTimeouts = {
  testTimeout: 30_000,
  hookTimeout: 120_000,
};
