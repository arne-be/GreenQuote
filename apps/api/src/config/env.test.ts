import { describe, expect, it } from "vitest";

import { validateEnv } from "./env.js";

describe("validateEnv", () => {
  it("fails with a message naming DATABASE_URL when it is missing", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it("defaults PORT to 3001", () => {
    expect(
      validateEnv({
        DATABASE_URL: "postgres://u:p@localhost:5432/db",
        JWT_SECRET: "x".repeat(32),
      }).PORT,
    ).toBe(3001);
  });
});
