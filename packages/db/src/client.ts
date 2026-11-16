import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "./schema/index.js";

export function createDb(databaseUrl: string) {
  return drizzle(postgres(databaseUrl), { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;

export function migrateDb(db: Db) {
  return migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
  });
}
