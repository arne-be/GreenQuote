import { createDb, type Db, migrateDb, users } from "@greenquote/db";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Actor } from "../../auth/auth.schema.ts";
import { ValidationError } from "../../errors.ts";
import { QuoteService } from "../quote.service.ts";

let container: StartedPostgreSqlContainer;
let db: Db;
let quotes: QuoteService;
let actor: Actor;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  db = createDb(container.getConnectionUri());
  await migrateDb(db);
  quotes = new QuoteService(db);
  const [user] = await db
    .insert(users)
    .values({
      fullName: "Ada Lovelace",
      email: "ada@test.com",
      passwordHash: "not used",
    })
    .returning({ id: users.id, role: users.role });
  if (user === undefined) throw new Error("Insert returned no user");
  actor = user;
}, 120_000);

afterAll(async () => {
  await db.$client.end();
  await container.stop();
});

describe("createQuote", () => {
  it("rejects a down payment above the system price on downPayment, even without the schema", async () => {
    // 6 kW at €1,200 per kW is €7,200.
    const error = await quotes
      .createQuote(actor, {
        fullName: "Ada Lovelace",
        email: "ada@test.com",
        address: "Musterstraße 1, 10115 Berlin",
        monthlyConsumptionKwh: 450,
        systemSizeKw: 6,
        downPayment: 7200.01,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ path: ["downPayment"] });
  });
});
