import { type Db, quotes } from "@greenquote/db";
import { eq } from "drizzle-orm";

import type { Actor } from "../../auth/auth.schema.ts";
import type { QuoteInput } from "../quote.schema.ts";
import { QuoteService } from "../quote.service.ts";

/** A quote with its offers, priced by the real calculation; `createdAt` backdates it. */
export async function createQuote(
  db: Db,
  actor: Actor,
  { createdAt, ...input }: Partial<QuoteInput> & { createdAt?: Date } = {},
) {
  const quote = await new QuoteService(db).createQuote(actor, {
    fullName: "Ada Lovelace",
    email: "ada@test.com",
    address: "Hauptstraße 1, 10115 Berlin",
    monthlyConsumptionKwh: 400,
    systemSizeKw: 8.5,
    ...input,
  });
  if (createdAt === undefined) return quote;
  await db.update(quotes).set({ createdAt }).where(eq(quotes.id, quote.id));
  return { ...quote, createdAt: createdAt.toISOString() };
}
