// Bump the version whenever a value below changes: stored quotes reference it (ADR 0002).
export const PRICING_RULES_VERSION = "2026-11-v1";

export const PRICING_RULES = {
  pricePerKwCents: 120_000,
  riskBandA: { minMonthlyConsumptionKwh: 400, maxSystemSizeKw: 6 },
  riskBandB: { minMonthlyConsumptionKwh: 250 },
  aprByRiskBand: { A: 0.069, B: 0.089, C: 0.119 },
  termsYears: [5, 10, 15],
} as const;
