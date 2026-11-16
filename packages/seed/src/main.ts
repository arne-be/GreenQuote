import { createDb } from "@greenquote/db";
import { z } from "zod";

import { seed } from "./seed.ts";

const env = z
  .object({
    DATABASE_URL: z.url(),
    SEED_ADMIN_PASSWORD: z.string().min(12),
    SEED_DEMO_DATA: z.stringbool().default(false),
    SEED_DEMO_PASSWORD: z.string().min(12).optional(),
  })
  .refine((e) => !e.SEED_DEMO_DATA || e.SEED_DEMO_PASSWORD !== undefined, {
    path: ["SEED_DEMO_PASSWORD"],
    message: "Required when SEED_DEMO_DATA is true",
  })
  .parse(process.env);
const db = createDb(env.DATABASE_URL);

await seed(db, {
  adminPassword: env.SEED_ADMIN_PASSWORD,
  demoPassword: env.SEED_DEMO_DATA ? env.SEED_DEMO_PASSWORD : undefined,
});
await db.$client.end();
