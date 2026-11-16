import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "../auth.schema.js";

const valid = {
  fullName: "Ada Lovelace",
  email: "ada@test.com",
  password: "correct horse",
};

describe("registerSchema", () => {
  it("trims and lowercases the email", () => {
    expect(
      registerSchema.parse({ ...valid, email: "  Ada@Test.COM " }).email,
    ).toBe("ada@test.com");
  });

  it.each([
    { password: "a".repeat(7), isValid: false },
    { password: "a".repeat(8), isValid: true },
    { password: "a".repeat(128), isValid: true },
    { password: "a".repeat(129), isValid: false },
  ])(
    "accepts a $password.length-character password: $isValid",
    ({ password, isValid }) => {
      expect(registerSchema.safeParse({ ...valid, password }).success).toBe(
        isValid,
      );
    },
  );

  it("rejects a blank full name", () => {
    expect(registerSchema.safeParse({ ...valid, fullName: "  " }).success).toBe(
      false,
    );
  });

  it("drops a role field", () => {
    expect(
      registerSchema.parse({ ...valid, role: "admin" }),
    ).not.toHaveProperty("role");
  });
});

describe("loginSchema", () => {
  it("trims and lowercases the email", () => {
    expect(
      loginSchema.parse({ email: " Ada@Test.com", password: "x" }).email,
    ).toBe("ada@test.com");
  });
});
