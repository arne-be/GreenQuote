import { createUser, startTestDb, type TestDb } from "@greenquote/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Actor } from "../../auth/auth.schema.ts";
import { ValidationError } from "../../errors.ts";
import { QuoteService } from "../quote.service.ts";

let testDb: TestDb;
let quotes: QuoteService;
let actor: Actor;

beforeAll(async () => {
  testDb = await startTestDb();
  quotes = new QuoteService(testDb.db);
  actor = await createUser(testDb.db);
});

afterAll(() => testDb.stop());

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
