import { describe, expect, it } from "vitest";

import { resolveStep } from "./steps";

const steps = [
  { id: "name", fields: ["fullName"] },
  { id: "email", fields: ["email"] },
  { id: "password", fields: ["password"] },
] as const;

describe("resolveStep", () => {
  it("shows a step the user has reached", () => {
    expect(resolveStep(steps, "email", 1)).toBe(1);
    expect(resolveStep(steps, "name", 2)).toBe(0);
  });

  it("goes back to the first step for a step the user has not reached, as after a reload", () => {
    expect(resolveStep(steps, "password", 0)).toBe(0);
    expect(resolveStep(steps, "password", 1)).toBe(0);
  });

  it("goes to the first step for a missing or unknown step", () => {
    expect(resolveStep(steps, null, 2)).toBe(0);
    expect(resolveStep(steps, "nope", 2)).toBe(0);
  });
});
