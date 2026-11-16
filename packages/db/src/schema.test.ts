import { execFileSync } from "node:child_process";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb, type Db } from "./client.js";
import { offers, quotes, users } from "./schema/index.js";

let container: StartedPostgreSqlContainer;
let db: Db;

const runScript = (script: string) =>
  execFileSync("pnpm", ["exec", "tsx", script], {
    env: {
      ...process.env,
      DATABASE_URL: container.getConnectionUri(),
      SEED_ADMIN_PASSWORD: "test-admin-password",
    },
  });

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  runScript("src/migrate.ts");
  db = createDb(container.getConnectionUri());
}, 120_000);

afterAll(async () => {
  await db.$client.end();
  await container.stop();
});

describe("seed", () => {
  it("leaves one admin when run twice", () => {
    runScript("src/seed.ts");
    runScript("src/seed.ts");

    return expect(
      db.select().from(users).where(eq(users.role, "admin")),
    ).resolves.toMatchObject([{ email: "admin@test.com" }]);
  });
});

describe("quote with offers", () => {
  it("is read back with its three offers", async () => {
    const [user] = await db
      .insert(users)
      .values({
        fullName: "Ada Lovelace",
        email: "ada@test.com",
        passwordHash: "hash",
      })
      .returning();
    if (user === undefined) throw new Error("user not inserted");

    const [quote] = await db
      .insert(quotes)
      .values({
        userId: user.id,
        applicantName: "Ada Lovelace",
        applicantEmail: "ada@test.com",
        applicantAddress: "1 Solar Street, Berlin",
        monthlyConsumptionKwh: 400,
        systemSizeKw: "6.50",
        downPaymentCents: 0,
        systemPriceCents: 1_300_000,
        riskBand: "A",
        apr: "0.0690",
        pricingRulesVersion: "2026-11-01",
      })
      .returning();
    if (quote === undefined) throw new Error("quote not inserted");

    await db.insert(offers).values([
      { quoteId: quote.id, termYears: 5, monthlyPaymentCents: 25_700 },
      { quoteId: quote.id, termYears: 10, monthlyPaymentCents: 15_030 },
      { quoteId: quote.id, termYears: 15, monthlyPaymentCents: 11_610 },
    ]);

    const [readBack] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quote.id));
    const readBackOffers = await db
      .select()
      .from(offers)
      .where(eq(offers.quoteId, quote.id))
      .orderBy(offers.termYears);

    expect(readBack).toMatchObject({
      systemSizeKw: "6.50",
      apr: "0.0690",
      riskBand: "A",
    });
    expect(readBackOffers).toMatchObject([
      { termYears: 5, monthlyPaymentCents: 25_700 },
      { termYears: 10, monthlyPaymentCents: 15_030 },
      { termYears: 15, monthlyPaymentCents: 11_610 },
    ]);
  });
});
