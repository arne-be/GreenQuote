import { PRICING_RULES, PRICING_RULES_VERSION } from "./pricing-rules.js";

export function calculateQuoteResult({
  systemSizeKw,
  monthlyConsumptionKwh,
  downPaymentCents,
}: QuoteInputs): QuoteResult {
  const systemPriceCents = Math.round(
    systemSizeKw * PRICING_RULES.pricePerKwCents,
  );
  const principalCents = systemPriceCents - downPaymentCents;
  const riskBand = toRiskBand(systemSizeKw, monthlyConsumptionKwh);
  const apr = PRICING_RULES.aprByRiskBand[riskBand];
  return {
    pricingRulesVersion: PRICING_RULES_VERSION,
    systemPriceCents,
    principalCents,
    riskBand,
    apr,
    offers: PRICING_RULES.termsYears.map((termYears) => ({
      termYears,
      apr,
      principalCents,
      monthlyPaymentCents: calculateMonthlyPaymentCents(
        principalCents,
        apr,
        termYears,
      ),
    })),
  };
}

// Annuity in float, rounded to cents once at the end.
export function calculateMonthlyPaymentCents(
  principalCents: number,
  apr: number,
  termYears: number,
): number {
  if (principalCents === 0) return 0;
  const r = apr / 12;
  const n = termYears * 12;
  return Math.round((principalCents * r) / (1 - (1 + r) ** -n));
}

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

function toRiskBand(
  systemSizeKw: number,
  monthlyConsumptionKwh: number,
): RiskBand {
  const { riskBandA, riskBandB } = PRICING_RULES;
  if (
    monthlyConsumptionKwh >= riskBandA.minMonthlyConsumptionKwh &&
    systemSizeKw <= riskBandA.maxSystemSizeKw
  ) {
    return "A";
  }
  if (monthlyConsumptionKwh >= riskBandB.minMonthlyConsumptionKwh) return "B";
  return "C";
}
