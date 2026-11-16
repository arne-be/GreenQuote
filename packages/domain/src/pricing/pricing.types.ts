import type { PRICING_RULES } from "./pricing-rules.ts";

export type RiskBand = keyof typeof PRICING_RULES.aprByRiskBand;

export interface QuoteInputs {
  systemSizeKw: number;
  monthlyConsumptionKwh: number;
  downPaymentCents: number;
}

export interface Offer {
  termYears: number;
  apr: number;
  principalCents: number;
  monthlyPaymentCents: number;
}

export interface QuoteResult {
  pricingRulesVersion: string;
  systemPriceCents: number;
  principalCents: number;
  riskBand: RiskBand;
  apr: number;
  offers: Offer[];
}
