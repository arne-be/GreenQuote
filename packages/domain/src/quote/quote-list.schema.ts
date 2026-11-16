import { z } from "zod";

import { userSchema } from "../auth/auth.schema.ts";
import { quoteSchema } from "./quote.schema.ts";

export const quoteListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe(
      "Matches the requesting user's and the applicant's name and email, ignoring case",
    ),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("How many quotes to return"),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("How many quotes to skip, newest first"),
});

/** One row of a quote list: the quote's summary fields plus the user who requested it. */
export const quoteListItemSchema = quoteSchema
  .pick({
    id: true,
    createdAt: true,
    fullName: true,
    email: true,
    systemSizeKw: true,
    systemPrice: true,
    riskBand: true,
  })
  .extend({
    user: userSchema
      .pick({ fullName: true, email: true })
      .describe("The user who requested the quote"),
  });

export const quoteListSchema = z.object({
  items: z.array(quoteListItemSchema).max(100).describe("One page of quotes"),
  total: z.int().min(0).describe("How many quotes match, across all pages"),
});

export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;
export type QuoteList = z.infer<typeof quoteListSchema>;
