import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { z } from "zod";

import { createDb } from "./client.js";

const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
const db = createDb(env.DATABASE_URL);

await migrate(db, {
  migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
});
await db.$client.end();
