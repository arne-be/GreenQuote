import { type Db, quotes, users } from "@greenquote/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import type { Actor } from "../auth/auth.schema.ts";
import { centsToEuros } from "../money.ts";
import { type QuoteList, type QuoteListQuery } from "./quote-list.schema.ts";

export class QuoteListService {
  constructor(private readonly db: Db) {}

  /** A user's own quotes, or every quote for an admin (ADR 0003). */
  async listQuotes(
    actor: Actor,
    { q, limit, offset }: QuoteListQuery,
  ): Promise<QuoteList> {
    const where = and(
      actor.role === "admin" ? undefined : eq(quotes.userId, actor.id),
      q ? matches(q) : undefined,
    );
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
