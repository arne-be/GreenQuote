import {
  type LoginInput,
  type RegisterInput,
  type User,
  userSchema,
} from "@greenquote/domain";

/** A non-2xx answer from the API, with its status so forms can map it to a field. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
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
    throw new ApiError(response.status, `POST ${path} failed`);
  }
  return response.status === 204 ? undefined : response.json();
}
