import { riskBand } from "@greenquote/db/schema";
import { z } from "zod";

import { registerSchema } from "../auth/auth.schema.ts";
import { centsToEuros, eurosToCents } from "../money.ts";
import { calculateSystemPriceCents } from "../pricing/pricing.ts";

export const DOWN_PAYMENT_ABOVE_SYSTEM_PRICE =
  "The down payment cannot exceed the system price";

// Bounds on stored values, not eligibility rules. Consumption and size fit the
// integer and numeric(7,2) columns; the address limit comes from issue #9.
const STORAGE_BOUNDS = {
  maxAddressLength: 300,
  maxMonthlyConsumptionKwh: 1_000_000,
  maxSystemSizeKw: 10_000,
};
// Money columns are Postgres integer cents. Response bounds must not follow the
// current pricing rules, or stored quotes from older rules would stop parsing.
const MAX_STORED_EUROS = centsToEuros(2_147_483_647);

// OpenAPI descriptions, shared by the request and the response.
const DESCRIPTIONS = {
  fullName: "The applicant's full name",
  email: "The applicant's email",
  address: "The address of the house the solar system is for",
  monthlyConsumptionKwh:
    "The household's average electricity use per month, in kWh",
  systemSizeKw: "The rated power of the solar system, in kW",
  downPayment:
    "The amount in euros paid upfront and not financed; at most the system price",
  apr: "The annual percentage rate set by the risk band, as a fraction",
};

// Form fields arrive as strings; the declared input types let react-hook-form bind them.
export const quoteInputSchema = z
  .object({
    fullName: registerSchema.shape.fullName.describe(DESCRIPTIONS.fullName),
    email: registerSchema.shape.email.describe(DESCRIPTIONS.email),
    address: z
      .string()
      .trim()
      .min(5, "Enter the full address")
      .max(STORAGE_BOUNDS.maxAddressLength)
      .describe(DESCRIPTIONS.address),
    monthlyConsumptionKwh: z.coerce
      .number<string | number>("Enter the monthly consumption in kWh")
      .int("Enter whole kWh")
      .positive("Enter a monthly consumption above 0 kWh")
      .max(STORAGE_BOUNDS.maxMonthlyConsumptionKwh)
      .describe(DESCRIPTIONS.monthlyConsumptionKwh),
    systemSizeKw: z.coerce
      .number<string | number>("Enter the system size in kW")
      .positive("Enter a system size above 0 kW")
      .max(STORAGE_BOUNDS.maxSystemSizeKw)
      .multipleOf(0.01, "Use at most 2 decimals")
      .describe(DESCRIPTIONS.systemSizeKw),
    downPayment: z
      .preprocess(
        (value: string | number | null | undefined) =>
          value === "" || value === null ? undefined : value,
        z.coerce
          .number<string | number>("Enter the down payment in euros")
          .nonnegative("Enter a down payment of 0 € or more")
          .multipleOf(0.01, "Use at most 2 decimals")
          .optional(),
      )
      .describe(DESCRIPTIONS.downPayment),
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

const euros = () => z.number().nonnegative().max(MAX_STORED_EUROS);
const apr = z.number().min(0).max(1).describe(DESCRIPTIONS.apr);

const offerSchema = z.object({
  termYears: z.int().positive().describe("The length of the offer in years"),
  apr,
  principalUsed: euros().describe("The amount this offer finances, in euros"),
  monthlyPayment: euros().describe(
    "The fixed amount paid each month over the term, in euros",
  ),
});

/** A quote as the API returns it: money in euros, APR as a fraction. */
export const quoteSchema = z.object({
  id: z.uuid().describe("The quote's id"),
  createdAt: z.iso.datetime().describe("When the quote was requested"),
  fullName: z.string().describe(DESCRIPTIONS.fullName),
  email: z.string().describe(DESCRIPTIONS.email),
  address: z.string().describe(DESCRIPTIONS.address),
  monthlyConsumptionKwh: z
    .int()
    .positive()
    .max(STORAGE_BOUNDS.maxMonthlyConsumptionKwh)
    .describe(DESCRIPTIONS.monthlyConsumptionKwh),
  systemSizeKw: z
    .number()
    .positive()
    .max(STORAGE_BOUNDS.maxSystemSizeKw)
    .describe(DESCRIPTIONS.systemSizeKw),
  downPayment: euros().describe(
    "The amount paid upfront, in euros; 0 when none",
  ),
  systemPrice: euros().describe(
    "The price of the solar system before any down payment, in euros",
  ),
  principal: euros().describe(
    "The amount financed (system price minus down payment), in euros",
  ),
  riskBand: z
    .enum(riskBand.enumValues)
    .describe("A coarse rating of the applicant that sets the APR"),
  apr,
  offers: z
    .array(offerSchema)
    .min(1)
    .describe(
      "One offer per term of the quote's pricing rules, shortest first",
    ),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type Quote = z.infer<typeof quoteSchema>;
