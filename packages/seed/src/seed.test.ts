import { execFileSync } from "node:child_process";

import { createDb, type Db, migrateDb, quotes, users } from "@greenquote/db";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { seed } from "./seed.ts";

let container: StartedPostgreSqlContainer;
let db: Db;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  db = createDb(container.getConnectionUri());
  await migrateDb(db);
}, 120_000);

beforeEach(async () => {
  await db.execute(sql`TRUNCATE users CASCADE`);
});

afterAll(async () => {
  await db.$client.end();
  await container.stop();
});

const adminPassword = "admin-password";
const demoPassword = "demo-password";

describe("seed", () => {
  it.each([undefined, "false"])(
    "seeds only the admin when SEED_DEMO_DATA is %s",
    async (seedDemoData) => {
      const env = {
        ...process.env,
        DATABASE_URL: container.getConnectionUri(),
        SEED_ADMIN_PASSWORD: adminPassword,
        SEED_DEMO_PASSWORD: demoPassword,
        // Node leaves undefined variables out of the child's environment.
        SEED_DEMO_DATA: seedDemoData,
      };
      execFileSync("pnpm", ["exec", "tsx", "src/main.ts"], { env });

      expect(await db.select({ email: users.email }).from(users)).toEqual([
        { email: "admin@test.com" },
      ]);
      expect(await db.select().from(quotes)).toEqual([]);
    },
  );

  it("seeds demo users and quotes for every risk band, spread over past weeks", async () => {
    await seed(db, { adminPassword, demoPassword });

    const rows = await db.select().from(quotes);
    const owners = await db.select().from(users);
    expect(owners.length).toBeGreaterThanOrEqual(4);
    // Every user, the admin included, owns some quotes.
    expect(new Set(rows.map((quote) => quote.userId)).size).toBe(owners.length);
    expect(new Set(rows.map((quote) => quote.riskBand))).toEqual(
      new Set(["A", "B", "C"]),
    );
    expect(rows.some((quote) => quote.downPaymentCents === 0)).toBe(true);
    expect(
      rows.some(
        (quote) =>
          quote.downPaymentCents > 0 &&
          quote.downPaymentCents < quote.systemPriceCents,
      ),
    ).toBe(true);
    expect(
      rows.some((quote) => quote.downPaymentCents === quote.systemPriceCents),
    ).toBe(true);
    const days = new Set(
      rows.map((quote) => quote.createdAt.toISOString().slice(0, 10)),
    );
    expect(days.size).toBe(rows.length);
  });

  it("changes nothing when run twice", async () => {
    await seed(db, { adminPassword, demoPassword });
    const usersBefore = await db.select().from(users).orderBy(users.id);
    const quotesBefore = await db.select().from(quotes).orderBy(quotes.id);

    await seed(db, { adminPassword, demoPassword });

    expect(await db.select().from(users).orderBy(users.id)).toEqual(
      usersBefore,
    );
    expect(await db.select().from(quotes).orderBy(quotes.id)).toEqual(
      quotesBefore,
    );
  });
});
