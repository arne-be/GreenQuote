import { type Db, offers, quotes } from "@greenquote/db";
import { and, eq } from "drizzle-orm";

import type { Actor } from "../auth/auth.schema.ts";
import { NotFoundError, ValidationError } from "../errors.ts";
import { centsToEuros, eurosToCents } from "../money.ts";
import { calculateQuoteResult } from "../pricing/pricing.ts";
import {
  DOWN_PAYMENT_ABOVE_SYSTEM_PRICE,
  type Quote,
  type QuoteInput,
} from "./quote.schema.ts";

type QuoteRow = typeof quotes.$inferSelect;
type OfferRow = typeof offers.$inferSelect;

export class QuoteService {
  constructor(private readonly db: Db) {}

  async createQuote(actor: Actor, input: QuoteInput): Promise<Quote> {
    const downPaymentCents = eurosToCents(input.downPayment ?? 0);
    const result = calculateQuoteResult({
      systemSizeKw: input.systemSizeKw,
      monthlyConsumptionKwh: input.monthlyConsumptionKwh,
      downPaymentCents,
    });
    // The schema checks this too, for the form; the service does not rely on its callers.
    if (result.principalCents < 0) {
      throw new ValidationError(DOWN_PAYMENT_ABOVE_SYSTEM_PRICE, [
        "downPayment",
      ]);
    }
    return this.db.transaction(async (tx) => {
      const [quote] = await tx
        .insert(quotes)
        .values({
          userId: actor.id,
          applicantName: input.fullName,
          applicantEmail: input.email,
          applicantAddress: input.address,
          monthlyConsumptionKwh: input.monthlyConsumptionKwh,
          systemSizeKw: String(input.systemSizeKw),
          downPaymentCents,
          systemPriceCents: result.systemPriceCents,
          riskBand: result.riskBand,
          apr: String(result.apr),
          pricingRulesVersion: result.pricingRulesVersion,
        })
        .returning();
      if (quote === undefined) throw new Error("Insert returned no quote");
      const quoteOffers = await tx
        .insert(offers)
        .values(
          result.offers.map((offer) => ({
            quoteId: quote.id,
            termYears: offer.termYears,
            monthlyPaymentCents: offer.monthlyPaymentCents,
          })),
        )
        .returning();
      return toQuote(quote, quoteOffers);
    });
  }

  /** Owner or admin; anyone else gets NotFound so quote ids are not revealed. */
  async getQuote(actor: Actor, id: string): Promise<Quote> {
    const [quote] = await this.db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.id, id),
          actor.role === "admin" ? undefined : eq(quotes.userId, actor.id),
        ),
      );
    if (quote === undefined) throw new NotFoundError("Quote not found");
    const quoteOffers = await this.db
      .select()
      .from(offers)
      .where(eq(offers.quoteId, id))
      .orderBy(offers.termYears);
    return toQuote(quote, quoteOffers);
  }
}

// Principal and each offer's APR and principal are derived, not stored (ADR 0002).
function toQuote(quote: QuoteRow, quoteOffers: OfferRow[]): Quote {
  const apr = Number(quote.apr);
  const principal = centsToEuros(
    quote.systemPriceCents - quote.downPaymentCents,
  );
  return {
    id: quote.id,
    createdAt: quote.createdAt.toISOString(),
    fullName: quote.applicantName,
    email: quote.applicantEmail,
    address: quote.applicantAddress,
    monthlyConsumptionKwh: quote.monthlyConsumptionKwh,
    systemSizeKw: Number(quote.systemSizeKw),
    downPayment: centsToEuros(quote.downPaymentCents),
    systemPrice: centsToEuros(quote.systemPriceCents),
    principal,
    riskBand: quote.riskBand,
    apr,
    offers: quoteOffers.map((offer) => ({
      termYears: offer.termYears,
      apr,
      principalUsed: principal,
      monthlyPayment: centsToEuros(offer.monthlyPaymentCents),
    })),
  };
}
