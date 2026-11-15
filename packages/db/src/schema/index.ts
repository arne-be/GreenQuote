import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const riskBand = pgEnum("risk_band", ["A", "B", "C"]);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  modifiedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    fullName: text().notNull(),
    email: text().notNull(),
    passwordHash: text().notNull(),
    role: userRole().notNull().default("user"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    applicantName: text().notNull(),
    applicantEmail: text().notNull(),
    address: text().notNull(),
    monthlyConsumptionKwh: integer().notNull(),
    systemSizeKw: numeric({ precision: 7, scale: 2 }).notNull(),
    downPaymentCents: integer().notNull(),
    systemPriceCents: integer().notNull(),
    riskBand: riskBand().notNull(),
    apr: numeric({ precision: 5, scale: 4 }).notNull(),
    pricingRulesVersion: text().notNull(),
    ...timestamps,
  },
  (t) => [
    index("quotes_user_id_created_at_index").on(t.userId, t.createdAt),
    check(
      "quotes_monthly_consumption_kwh_check",
      sql`${t.monthlyConsumptionKwh} > 0`,
    ),
    check("quotes_system_size_kw_check", sql`${t.systemSizeKw} > 0`),
    check("quotes_down_payment_cents_check", sql`${t.downPaymentCents} >= 0`),
    check("quotes_system_price_cents_check", sql`${t.systemPriceCents} > 0`),
    check("quotes_apr_check", sql`${t.apr} >= 0`),
  ],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid().primaryKey().defaultRandom(),
    quoteId: uuid()
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    termYears: integer().notNull(),
    monthlyPaymentCents: integer().notNull(),
    ...timestamps,
  },
  (t) => [
    unique("offers_quote_id_term_years_unique").on(t.quoteId, t.termYears),
    check("offers_term_years_check", sql`${t.termYears} > 0`),
    check(
      "offers_monthly_payment_cents_check",
      sql`${t.monthlyPaymentCents} >= 0`,
    ),
  ],
);
