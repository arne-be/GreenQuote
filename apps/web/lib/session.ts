import { type User, userSchema } from "@greenquote/domain";
import { cookies } from "next/headers";

import { env } from "@/env";

/** The signed-in user, or null without a valid session. Server components only. */
export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch(`${env.API_URL}/api/auth/me`, {
    headers: { cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`GET /api/auth/me failed with ${response.status}`);
  }
  return userSchema.parse(await response.json());
}
