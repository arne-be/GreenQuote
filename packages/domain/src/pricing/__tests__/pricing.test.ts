import { describe, expect, it } from "vitest";

import {
  calculateMonthlyPaymentCents,
  calculateQuoteResult,
} from "../pricing.ts";
import { PRICING_RULES, PRICING_RULES_VERSION } from "../pricing-rules.ts";

describe("pricing rules", () => {
  it("only change together with a version bump", () => {
    expect({ PRICING_RULES_VERSION, PRICING_RULES }).toMatchSnapshot();
  });
});

describe("calculateMonthlyPaymentCents", () => {
  it("matches the reference annuity: €7,800 at 6.9% over 10 years is €90.16", () => {
    expect(calculateMonthlyPaymentCents(780_000, 0.069, 10)).toBe(9016);
  });
});

describe("calculateQuoteResult", () => {
  it.each([
    { monthlyConsumptionKwh: 400, systemSizeKw: 6, riskBand: "A", apr: 0.069 },
    { monthlyConsumptionKwh: 399, systemSizeKw: 6, riskBand: "B", apr: 0.089 },
    {
      monthlyConsumptionKwh: 400,
      systemSizeKw: 6.01,
      riskBand: "B",
      apr: 0.089,
    },
    { monthlyConsumptionKwh: 250, systemSizeKw: 6, riskBand: "B", apr: 0.089 },
    { monthlyConsumptionKwh: 249, systemSizeKw: 6, riskBand: "C", apr: 0.119 },
  ])(
    "puts $monthlyConsumptionKwh kWh and $systemSizeKw kW in risk band $riskBand",
    ({ monthlyConsumptionKwh, systemSizeKw, riskBand, apr }) => {
      const result = calculateQuoteResult({
        systemSizeKw,
        monthlyConsumptionKwh,
        downPaymentCents: 0,
      });

      expect(result.riskBand).toBe(riskBand);
      expect(result.apr).toBe(apr);
    },
  );

  it("prices the system per kW and subtracts the down payment from the principal", () => {
    const result = calculateQuoteResult({
      systemSizeKw: 6.5,
      monthlyConsumptionKwh: 400,
      downPaymentCents: 100_000,
    });

    expect(result.systemPriceCents).toBe(780_000);
    expect(result.principalCents).toBe(680_000);
  });

  it("makes one offer per term with the annuity monthly payment", () => {
    const result = calculateQuoteResult({
      systemSizeKw: 6.5,
      monthlyConsumptionKwh: 400,
      downPaymentCents: 0,
    });

    expect(result.pricingRulesVersion).toBe(PRICING_RULES_VERSION);
    expect(result.offers.map((offer) => offer.termYears)).toEqual([5, 10, 15]);
    const tenYears = result.offers[1];
    if (tenYears === undefined) throw new Error("missing 10-year offer");
    expect(tenYears).toEqual({
      termYears: 10,
      apr: 0.089,
      principalCents: 780_000,
      monthlyPaymentCents: 9839,
    });
  });

  it("gives a zero monthly payment for every offer when the principal is zero", () => {
    const result = calculateQuoteResult({
      systemSizeKw: 5,
      monthlyConsumptionKwh: 300,
      downPaymentCents: 600_000,
    });

    expect(result.principalCents).toBe(0);
    expect(result.offers.map((offer) => offer.monthlyPaymentCents)).toEqual([
      0, 0, 0,
    ]);
  });
});
