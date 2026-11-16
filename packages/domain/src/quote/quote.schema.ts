import { riskBand } from "@greenquote/db/schema";
import { z } from "zod";

import { registerSchema } from "../auth/auth.schema.ts";
import { eurosToCents } from "../money.ts";
import { calculateSystemPriceCents } from "../pricing/pricing.ts";

export const DOWN_PAYMENT_ABOVE_SYSTEM_PRICE =
  "The down payment cannot exceed the system price";

// Bounds that keep values storable in the quote columns, not eligibility rules.
const STORAGE_BOUNDS = {
  maxAddressLength: 300,
  maxMonthlyConsumptionKwh: 1_000_000,
  maxSystemSizeKw: 10_000,
};

export const quoteInputSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Enter the applicant's full name")
      .max(200),
    email: registerSchema.shape.email,
    address: z
      .string()
      .trim()
      .min(5, "Enter the full address")
      .max(STORAGE_BOUNDS.maxAddressLength),
    monthlyConsumptionKwh: z.coerce
      .number("Enter the monthly consumption in kWh")
      .int("Enter whole kWh")
      .positive("Enter a monthly consumption above 0 kWh")
      .max(STORAGE_BOUNDS.maxMonthlyConsumptionKwh),
    systemSizeKw: z.coerce
      .number("Enter the system size in kW")
      .positive("Enter a system size above 0 kW")
      .max(STORAGE_BOUNDS.maxSystemSizeKw)
      .multipleOf(0.01, "Use at most 2 decimals"),
    downPayment: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce
        .number("Enter the down payment in euros")
        .nonnegative("Enter a down payment of 0 € or more")
        .multipleOf(0.01, "Use at most 2 decimals")
        .optional(),
    ),
  })
  .refine(
    ({ downPayment, systemSizeKw }) =>
      downPayment === undefined ||
      eurosToCents(downPayment) <= calculateSystemPriceCents(systemSizeKw),
    {
      path: ["downPayment"],
      message: DOWN_PAYMENT_ABOVE_SYSTEM_PRICE,
      // Without a valid system size there is no price to compare against.
      when: ({ issues }) => issues.length === 0,
    },
  );

const offerSchema = z.object({
  termYears: z.int(),
  apr: z.number(),
  principalUsed: z.number(),
  monthlyPayment: z.number(),
});

/** A quote as the API returns it: money in euros, APR as a fraction. */
export const quoteSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  fullName: z.string(),
  email: z.string(),
  address: z.string(),
  monthlyConsumptionKwh: z.int(),
  systemSizeKw: z.number(),
  downPayment: z.number(),
  systemPrice: z.number(),
  principal: z.number(),
  riskBand: z.enum(riskBand.enumValues),
  apr: z.number(),
  offers: z.array(offerSchema),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type Quote = z.infer<typeof quoteSchema>;
