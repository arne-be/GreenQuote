import { riskBand } from "@greenquote/db/schema";
import { z } from "zod";

export const quoteListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** One row of a quote list: money in euros, the applicant as fullName/email like a quote. */
export const quoteListItemSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  fullName: z.string(),
  email: z.string(),
  systemSizeKw: z.number(),
  systemPrice: z.number(),
  riskBand: z.enum(riskBand.enumValues),
  user: z.object({ fullName: z.string(), email: z.string() }),
});

export const quoteListSchema = z.object({
  items: z.array(quoteListItemSchema),
  total: z.int(),
});

export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;
export type QuoteList = z.infer<typeof quoteListSchema>;
