import {
  calculateQuoteResult,
  centsToEuros,
  eurosToCents,
  type QuoteInput,
  quoteInputSchema,
  type QuoteResult,
} from "@greenquote/domain";
import type { z } from "zod";

import type { Step } from "@/lib/steps";

/** The form's values as entered, before the schema coerces them. */
export type QuoteFormValues = z.input<typeof quoteInputSchema>;

export const quoteSteps = [
  { id: "applicant", fields: ["fullName", "email"] },
  { id: "address", fields: ["address"] },
  { id: "consumption", fields: ["monthlyConsumptionKwh"] },
  { id: "size", fields: ["systemSizeKw"] },
  { id: "down-payment", fields: ["downPayment"] },
  { id: "summary", fields: [] },
] as const satisfies Step<QuoteInput>[];

/**
 * The Preview: the quote result for the values entered so far, or null until
 * the consumption and the system size are valid. An invalid down payment
 * counts as none; the form shows its error.
 */
export function previewQuote({
  monthlyConsumptionKwh,
  systemSizeKw,
  downPayment,
}: Pick<
  QuoteFormValues,
  "monthlyConsumptionKwh" | "systemSizeKw" | "downPayment"
>): QuoteResult | null {
  const { shape } = quoteInputSchema;
  const consumption = shape.monthlyConsumptionKwh.safeParse(
    monthlyConsumptionKwh,
  );
  const size = shape.systemSizeKw.safeParse(systemSizeKw);
  if (!consumption.success || !size.success) return null;
  const down = shape.downPayment.safeParse(downPayment);
  return calculateQuoteResult({
    monthlyConsumptionKwh: consumption.data,
    systemSizeKw: size.data,
    downPaymentCents: eurosToCents((down.success && down.data) || 0),
  });
}

/** The down payment lowered to the system price, or undefined if it fits. */
export function lowerDownPayment(
  downPayment: QuoteFormValues["downPayment"],
  systemPriceCents: number,
): string | undefined {
  const down = quoteInputSchema.shape.downPayment.safeParse(downPayment);
  if (!down.success || down.data === undefined) return undefined;
  if (eurosToCents(down.data) <= systemPriceCents) return undefined;
  return String(centsToEuros(systemPriceCents));
}
