import { z } from "zod";

import { createDb, migrateDb } from "./client.js";

const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
const db = createDb(env.DATABASE_URL);

await migrateDb(db);
await db.$client.end();
