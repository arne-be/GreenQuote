import { startTestDb, type TestDb } from "@greenquote/db/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ConflictError, UnauthorisedError } from "../../errors.ts";
import { AuthService, type PasswordHasher } from "../auth.service.ts";

const fakeHasher: PasswordHasher = {
  hash: (password) => Promise.resolve(`hashed:${password}`),
  verify: (hash, password) => Promise.resolve(hash === `hashed:${password}`),
};

let testDb: TestDb;
let auth: AuthService;

beforeAll(async () => {
  testDb = await startTestDb();
  auth = new AuthService(testDb.db, fakeHasher);
});

afterAll(() => testDb.stop());

describe("register", () => {
  it("creates a user with role user and returns it without the password hash", async () => {
    const user = await auth.register({
      fullName: "Ada Lovelace",
      email: "ada@test.com",
      password: "correct horse",
    });

    expect(user).toEqual({
      id: expect.any(String) as string,
      fullName: "Ada Lovelace",
      email: "ada@test.com",
      role: "user",
    });
  });

  it("rejects an email that is already registered, whatever its case", async () => {
    await auth.register({
      fullName: "Grace Hopper",
      email: "grace@test.com",
      password: "correct horse",
    });

    await expect(
      auth.register({
        fullName: "Grace Hopper",
        email: "GRACE@test.com",
        password: "correct horse",
      }),
    ).rejects.toThrow(ConflictError);
  });
});

describe("login", () => {
  beforeAll(() =>
    auth.register({
      fullName: "Alan Turing",
      email: "alan@test.com",
      password: "enigma machine",
    }),
  );

  it("returns the user for the right password", async () => {
    await expect(
      auth.login({ email: "alan@test.com", password: "enigma machine" }),
    ).resolves.toMatchObject({ email: "alan@test.com", role: "user" });
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const wrongPassword = auth
      .login({ email: "alan@test.com", password: "wrong password" })
      .catch((error: unknown) => error);
    const unknownEmail = auth
      .login({ email: "nobody@test.com", password: "enigma machine" })
      .catch((error: unknown) => error);

    const [a, b] = await Promise.all([wrongPassword, unknownEmail]);
    expect(a).toBeInstanceOf(UnauthorisedError);
    expect(b).toEqual(a);
  });
});

describe("login timing", () => {
  it("still checks a password for an unknown email, so it takes as long as a wrong password", async () => {
    const verify = vi.fn((hash: string, password: string) =>
      fakeHasher.verify(hash, password),
    );
    const timedAuth = new AuthService(testDb.db, { ...fakeHasher, verify });

    await expect(
      timedAuth.login({ email: "nobody@test.com", password: "enigma machine" }),
    ).rejects.toThrow(UnauthorisedError);
    expect(verify).toHaveBeenCalledOnce();
  });
});

describe("getUser", () => {
  it("returns the acting user", async () => {
    const { id } = await auth.register({
      fullName: "Katherine Johnson",
      email: "katherine@test.com",
      password: "correct horse",
    });

    await expect(auth.getUser({ id, role: "user" })).resolves.toMatchObject({
      id,
      fullName: "Katherine Johnson",
    });
  });

  it("rejects an actor whose user no longer exists", async () => {
    await expect(
      auth.getUser({
        id: "00000000-0000-4000-8000-000000000000",
        role: "user",
      }),
    ).rejects.toThrow(UnauthorisedError);
  });
});
