import { createDb, type Db, migrateDb, quotes, users } from "@greenquote/db";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Actor } from "../../auth/auth.schema.ts";
import { QuoteService } from "../quote.service.ts";

let container: StartedPostgreSqlContainer;
let db: Db;
let service: QuoteService;
let ada: Actor;
let grace: Actor;
let admin: Actor;

async function insertUser(
  fullName: string,
  email: string,
  role: Actor["role"],
) {
  const [user] = await db
    .insert(users)
    .values({ fullName, email, passwordHash: "not used", role })
    .returning({ id: users.id, role: users.role });
  if (user === undefined) throw new Error("Insert returned no user");
  return user;
}

function insertQuote(
  userId: string,
  applicantName: string,
  applicantEmail: string,
  createdAt: string,
) {
  return db.insert(quotes).values({
    userId,
    applicantName,
    applicantEmail,
    applicantAddress: "Hauptstraße 1, 10115 Berlin",
    monthlyConsumptionKwh: 400,
    systemSizeKw: "8.50",
    downPaymentCents: 0,
    systemPriceCents: 1_020_000,
    riskBand: "B",
    apr: "0.0690",
    pricingRulesVersion: "test",
    createdAt: new Date(createdAt),
  });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  db = createDb(container.getConnectionUri());
  await migrateDb(db);
  service = new QuoteService(db);

  ada = await insertUser("Ada Lovelace", "ada@test.com", "user");
  grace = await insertUser("Grace Hopper", "grace@test.com", "user");
  admin = await insertUser("Alan Admin", "admin@test.com", "admin");
  await insertQuote(ada.id, "Ada Lovelace", "ada@test.com", "2026-01-01");
  await insertQuote(
    ada.id,
    "Charles Babbage",
    "charles@test.com",
    "2026-01-02",
  );
  // Same timestamp as each other: order must still be stable (id breaks the tie).
  await insertQuote(grace.id, "Grace Hopper", "grace@test.com", "2026-01-03");
  await insertQuote(grace.id, "Howard Aiken", "howard@test.com", "2026-01-03");
  await insertQuote(
    grace.id,
    "Ada Namesake",
    "namesake@test.com",
    "2026-01-04",
  );
}, 120_000);

afterAll(async () => {
  await db.$client.end();
  await container.stop();
});

const all = { limit: 100, offset: 0 };

describe("listQuotes", () => {
  it("shows a user only their own quotes, newest first", async () => {
    const result = await service.listQuotes(ada, all);

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.fullName)).toEqual([
      "Charles Babbage",
      "Ada Lovelace",
    ]);
  });

  it("shows an admin every quote with the user who requested it", async () => {
    const result = await service.listQuotes(admin, all);

    expect(result.total).toBe(5);
    expect(result.items[0]).toEqual({
      id: expect.any(String) as string,
      createdAt: "2026-01-04T00:00:00.000Z",
      fullName: "Ada Namesake",
      email: "namesake@test.com",
      systemSizeKw: 8.5,
      systemPrice: 10_200,
      riskBand: "B",
      user: { fullName: "Grace Hopper", email: "grace@test.com" },
    });
  });

  it.each([
    [
      "user full name",
      "hopper",
      ["Ada Namesake", "Howard Aiken", "Grace Hopper"],
    ],
    ["user email", "ADA@TEST", ["Charles Babbage", "Ada Lovelace"]],
    ["applicant name", "babbage", ["Charles Babbage"]],
    ["applicant email", "howard@", ["Howard Aiken"]],
  ])("matches q against the %s, ignoring case", async (_field, q, expected) => {
    const result = await service.listQuotes(admin, { ...all, q });

    expect(result.items.map((item) => item.fullName).sort()).toEqual(
      [...expected].sort(),
    );
    expect(result.total).toBe(expected.length);
  });

  it("treats % and _ in q as plain characters", async () => {
    const result = await service.listQuotes(admin, { ...all, q: "%" });

    expect(result).toEqual({ items: [], total: 0 });
  });

  it("pages in a stable order and reports the total of all matches", async () => {
    const everything = await service.listQuotes(admin, all);
    const pages = await Promise.all(
      [0, 2, 4].map((offset) =>
        service.listQuotes(admin, { limit: 2, offset }),
      ),
    );

    expect(pages.map((page) => page.total)).toEqual([5, 5, 5]);
    expect(pages.flatMap((page) => page.items)).toEqual(everything.items);
  });

  it("never shows a user another user's quote, whatever the q, limit and offset", async () => {
    for (const q of [undefined, "", "a", "grace", "hopper", "howard", "%"]) {
      for (const limit of [1, 2, 100]) {
        for (const offset of [0, 1, 4]) {
          const result = await service.listQuotes(ada, { q, limit, offset });
          for (const item of result.items) {
            expect(item.user.email).toBe("ada@test.com");
          }
          expect(result.total).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});
