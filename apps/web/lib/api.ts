import {
  type LoginInput,
  type Quote,
  type QuoteInput,
  quoteSchema,
  type RegisterInput,
  type User,
  userSchema,
} from "@greenquote/domain";
import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/env";

/** A non-2xx answer from the API, with its status and any field errors so forms can map them to fields. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
  }
}

// The `errors` of a 400, from the Zod pipe or a domain ValidationError.
const fieldErrorsSchema = z.object({
  errors: z.array(
    z.object({
      path: z.array(z.union([z.string(), z.number()])),
      message: z.string(),
    }),
  ),
});

type FieldError = z.infer<typeof fieldErrorsSchema>["errors"][number];

/** The signed-in user, or null without a valid session. Server only: pass the request's cookie header. */
export async function getCurrentUser(cookie: string): Promise<User | null> {
  const response = await fetch(`${env.API_URL}/api/auth/me`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new ApiError(response.status, "GET /api/auth/me failed");
  }
  return userSchema.parse(await response.json());
}

/** The quote, or null when it does not exist or is not the user's. Server only, like getCurrentUser. */
export async function getQuote(
  cookie: string,
  id: string,
): Promise<Quote | null> {
  const response = await fetch(`${env.API_URL}/api/quotes/${id}`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  // 400 is an id that is not a UUID: no such quote either.
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new ApiError(response.status, "GET /api/quotes/:id failed");
  }
  return quoteSchema.parse(await response.json());
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  return quoteSchema.parse(await post("/api/quotes", input));
}

export async function register(input: RegisterInput): Promise<User> {
  return userSchema.parse(await post("/api/auth/register", input));
}

export async function login(input: LoginInput): Promise<User> {
  return userSchema.parse(await post("/api/auth/login", input));
}

export async function logout(): Promise<void> {
  await post("/api/auth/logout");
}

async function post(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  });
  if (!response.ok) {
    const body = fieldErrorsSchema.safeParse(
      await response.json().catch(() => null),
    );
    throw new ApiError(
      response.status,
      `POST ${path} failed`,
      body.success ? body.data.errors : [],
    );
  }
  return response.status === 204 ? undefined : response.json();
}
