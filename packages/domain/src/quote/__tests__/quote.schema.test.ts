import { describe, expect, it } from "vitest";

import { quoteInputSchema } from "../quote.schema.ts";

const valid = {
  fullName: "Ada Lovelace",
  email: "ada@test.com",
  address: "Musterstraße 1, 10115 Berlin",
  monthlyConsumptionKwh: 450,
  systemSizeKw: 6,
};

const errorPaths = (input: object) =>
  quoteInputSchema
    .safeParse({ ...valid, ...input })
    .error?.issues.map((issue) => issue.path.join("."));

describe("quoteInputSchema", () => {
  it("coerces form strings to numbers and trims the address", () => {
    expect(
      quoteInputSchema.parse({
        ...valid,
        address: "  Musterstraße 1, 10115 Berlin ",
        monthlyConsumptionKwh: "450",
        systemSizeKw: "6.5",
        downPayment: "1000.50",
      }),
    ).toEqual({
      ...valid,
      systemSizeKw: 6.5,
      downPayment: 1000.5,
    });
  });

  it("leaves a blank down payment absent", () => {
    expect(
      quoteInputSchema.parse({ ...valid, downPayment: "" }).downPayment,
    ).toBeUndefined();
  });

  it.each([
    { address: "1234", isValid: false },
    { address: "12345", isValid: true },
    { address: "a".repeat(300), isValid: true },
    { address: "a".repeat(301), isValid: false },
    { monthlyConsumptionKwh: 0, isValid: false },
    { monthlyConsumptionKwh: 1_000_000, isValid: true },
    { monthlyConsumptionKwh: 1_000_001, isValid: false },
    { monthlyConsumptionKwh: 450.5, isValid: false },
    { systemSizeKw: 0, isValid: false },
    { systemSizeKw: 10_000, isValid: true },
    { systemSizeKw: 10_000.01, isValid: false },
    { systemSizeKw: 6.125, isValid: false },
    { downPayment: -0.01, isValid: false },
    { downPayment: 0, isValid: true },
    { downPayment: 100.125, isValid: false },
  ])("validates %o", ({ isValid, ...input }) => {
    expect(errorPaths(input) === undefined).toBe(isValid);
  });

  it("accepts a down payment equal to the system price", () => {
    // 6 kW at €1,200 per kW is €7,200.
    expect(errorPaths({ downPayment: 7200 })).toBeUndefined();
  });

  it("rejects a down payment above the system price on downPayment", () => {
    expect(errorPaths({ downPayment: 7200.01 })).toEqual(["downPayment"]);
  });

  it("does not compare the down payment with an invalid system size", () => {
    expect(errorPaths({ systemSizeKw: 0, downPayment: 1000 })).toEqual([
      "systemSizeKw",
    ]);
  });
});
