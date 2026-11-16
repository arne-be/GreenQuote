import { calculateQuoteResult } from "@greenquote/domain";
import { describe, expect, it } from "vitest";

import { lowerDownPayment, previewQuote, quoteSteps } from "./quote-steps";

describe("quoteSteps", () => {
  it("asks for the applicant, address, consumption, size and down payment, then shows a summary", () => {
    expect(quoteSteps.map(({ id, fields }) => [id, fields])).toEqual([
      ["applicant", ["fullName", "email"]],
      ["address", ["address"]],
      ["consumption", ["monthlyConsumptionKwh"]],
      ["size", ["systemSizeKw"]],
      ["down-payment", ["downPayment"]],
      ["summary", []],
    ]);
  });
});

describe("previewQuote", () => {
  it("is the result of calculateQuoteResult for the values entered so far", () => {
    const preview = previewQuote({
      monthlyConsumptionKwh: "400",
      systemSizeKw: "6",
      downPayment: "1000",
    });

    expect(preview).toEqual(
      calculateQuoteResult({
        monthlyConsumptionKwh: 400,
        systemSizeKw: 6,
        downPaymentCents: 100_000,
      }),
    );
    expect(preview).toMatchObject({
      systemPriceCents: 720_000,
      principalCents: 620_000,
      riskBand: "A",
      apr: 0.069,
    });
  });

  it("counts an empty down payment as none", () => {
    expect(
      previewQuote({
        monthlyConsumptionKwh: "400",
        systemSizeKw: "6",
        downPayment: "",
      })?.principalCents,
    ).toBe(720_000);
  });

  it("is null until the consumption and the system size are valid", () => {
    expect(
      previewQuote({
        monthlyConsumptionKwh: "400",
        systemSizeKw: "",
        downPayment: "",
      }),
    ).toBeNull();
    expect(
      previewQuote({
        monthlyConsumptionKwh: "",
        systemSizeKw: "6",
        downPayment: "",
      }),
    ).toBeNull();
  });
});

describe("lowerDownPayment", () => {
  it("lowers a down payment above the system price to the price", () => {
    expect(lowerDownPayment("9000", 720_000)).toBe("7200");
    expect(lowerDownPayment("7200.01", 720_000)).toBe("7200");
  });

  it("keeps a down payment up to the system price, or none", () => {
    expect(lowerDownPayment("7200", 720_000)).toBeUndefined();
    expect(lowerDownPayment("0", 720_000)).toBeUndefined();
    expect(lowerDownPayment("", 720_000)).toBeUndefined();
  });
});
