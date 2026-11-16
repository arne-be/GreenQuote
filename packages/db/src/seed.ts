import { hash } from "@node-rs/argon2";
import { z } from "zod";

import { createDb } from "./client.js";
import { users } from "./schema/index.js";

const env = z
  .object({ DATABASE_URL: z.url(), SEED_ADMIN_PASSWORD: z.string().min(12) })
  .parse(process.env);
const db = createDb(env.DATABASE_URL);

await db
  .insert(users)
  .values({
    fullName: "Admin",
    email: "admin@test.com",
    passwordHash: await hash(env.SEED_ADMIN_PASSWORD),
    role: "admin",
  })
  .onConflictDoNothing();
await db.$client.end();
