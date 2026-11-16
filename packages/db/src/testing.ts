import { randomUUID } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { createDb, type Db, migrateDb } from "./client.js";
import { users } from "./schema/index.js";

export type TestDb = Awaited<ReturnType<typeof startTestDb>>;

/** A migrated Postgres in its own container. Call `stop` in `afterAll`. */
export async function startTestDb() {
  const container = await new PostgreSqlContainer("postgres:17-alpine").start();
  const databaseUrl = container.getConnectionUri();
  const db = createDb(databaseUrl);
  await migrateDb(db);
  return {
    db,
    databaseUrl,
    stop: async () => {
      await db.$client.end();
      await container.stop();
    },
  };
}

/** Inserts a user; the default email is unique so calls do not collide. */
export async function createUser(
  db: Db,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const [user] = await db
    .insert(users)
    .values({
      fullName: "Ada Lovelace",
      email: `${randomUUID()}@test.com`,
      passwordHash: "not used",
      ...overrides,
    })
    .returning();
  if (user === undefined) throw new Error("Insert returned no user");
  return user;
}
