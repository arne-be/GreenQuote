import { type Db, offers, quotes, users } from "@greenquote/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import type { Actor } from "../auth/auth.schema.ts";
import { NotFoundError, ValidationError } from "../errors.ts";
import { centsToEuros, eurosToCents } from "../money.ts";
import { calculateQuoteResult } from "../pricing/pricing.ts";
import {
  DOWN_PAYMENT_ABOVE_SYSTEM_PRICE,
  type Quote,
  type QuoteInput,
} from "./quote.schema.ts";
import type { QuoteList, QuoteListQuery } from "./quote-list.schema.ts";

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
      .where(and(eq(quotes.id, id), visibleTo(actor)));
    if (quote === undefined) throw new NotFoundError("Quote not found");
    const quoteOffers = await this.db
      .select()
      .from(offers)
      .where(eq(offers.quoteId, id))
      .orderBy(offers.termYears);
    return toQuote(quote, quoteOffers);
  }

  /** A user's own quotes, or every quote for an admin (ADR 0003). */
  async listQuotes(
    actor: Actor,
    { q, limit, offset }: QuoteListQuery,
  ): Promise<QuoteList> {
    const where = and(visibleTo(actor), q ? matches(q) : undefined);
    const [rows, [counted]] = await Promise.all([
      this.db
        .select({
          id: quotes.id,
          createdAt: quotes.createdAt,
          fullName: quotes.applicantName,
          email: quotes.applicantEmail,
          systemSizeKw: quotes.systemSizeKw,
          systemPriceCents: quotes.systemPriceCents,
          riskBand: quotes.riskBand,
          user: { fullName: users.fullName, email: users.email },
        })
        .from(quotes)
        .innerJoin(users, eq(users.id, quotes.userId))
        .where(where)
        .orderBy(desc(quotes.createdAt), desc(quotes.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(quotes)
        .innerJoin(users, eq(users.id, quotes.userId))
        .where(where),
    ]);
    return {
      items: rows.map(
        ({ createdAt, systemSizeKw, systemPriceCents, ...row }) => ({
          ...row,
          createdAt: createdAt.toISOString(),
          systemSizeKw: Number(systemSizeKw),
          systemPrice: centsToEuros(systemPriceCents),
        }),
      ),
      total: counted?.total ?? 0,
    };
  }
}

/** The one place the role scope lives (ADR 0003): an admin sees every quote, a user only their own. */
function visibleTo(actor: Actor) {
  return actor.role === "admin" ? undefined : eq(quotes.userId, actor.id);
}

// shortcut: '%q%' cannot use an index and scans every row in scope; add a trigram index when lists grow large.
function matches(q: string) {
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  return or(
    ilike(users.fullName, pattern),
    ilike(users.email, pattern),
    ilike(quotes.applicantName, pattern),
    ilike(quotes.applicantEmail, pattern),
  );
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
