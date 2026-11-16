import { type Db, users } from "@greenquote/db";
import { eq, sql } from "drizzle-orm";

import { ConflictError, UnauthorisedError } from "../errors.ts";
import type { Actor, LoginInput, RegisterInput, User } from "./auth.schema.ts";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

const UNIQUE_VIOLATION = "23505";
const userColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  role: users.role,
};

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly hasher: PasswordHasher,
  ) {}

  async register(input: RegisterInput): Promise<User> {
    const passwordHash = await this.hasher.hash(input.password);
    // No "does it exist?" read first: the unique index on lower(email) decides, race-free.
    try {
      const [user] = await this.db
        .insert(users)
        .values({ fullName: input.fullName, email: input.email, passwordHash })
        .returning(userColumns);
      if (user === undefined) throw new Error("Insert returned no user");
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("Email is already registered");
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<User> {
    const [found] = await this.db
      .select({ ...userColumns, passwordHash: users.passwordHash })
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`);
    if (found === undefined) throw invalidCredentials();
    const { passwordHash, ...user } = found;
    if (!(await this.hasher.verify(passwordHash, input.password))) {
      throw invalidCredentials();
    }
    return user;
  }

  async getUser(actor: Actor): Promise<User> {
    const [user] = await this.db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, actor.id));
    if (user === undefined) throw new UnauthorisedError("Not signed in");
    return user;
  }
}

// One error for unknown email and wrong password, so neither reveals which it was.
function invalidCredentials() {
  return new UnauthorisedError("Email or password is incorrect");
}

function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps the driver error; the Postgres code is on its cause.
  return (
    error instanceof Error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause &&
    error.cause.code === UNIQUE_VIOLATION
  );
}
