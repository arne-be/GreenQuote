import type { Server } from "node:http";

import { startTestDb, type TestDb } from "@greenquote/db/testing";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../app.module.js";
import { configureApp } from "../configure-app.js";
import { DATABASE } from "../database.module.js";

let testDb: TestDb;
let app: INestApplication<Server>;

beforeAll(async () => {
  testDb = await startTestDb();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE)
    .useValue(testDb.db)
    .compile();
  app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
});

afterAll(async () => {
  await app.close();
  await testDb.stop();
});

const register = (email: string, password = "correct horse") =>
  request(app.getHttpServer())
    .post("/api/auth/register")
    .send({ fullName: "Ada Lovelace", email, password });

const sessionCookie = (response: request.Response) => {
  const cookie = response.get("Set-Cookie")?.[0];
  if (cookie === undefined) throw new Error("no Set-Cookie header");
  return cookie.split(";")[0] ?? "";
};

describe("POST /api/auth/register", () => {
  it("creates the user and sets an httpOnly, SameSite=Lax session cookie", async () => {
    const response = await register("ada@test.com").expect(201);

    expect(response.body).toEqual({
      id: expect.any(String) as string,
      fullName: "Ada Lovelace",
      email: "ada@test.com",
      role: "user",
    });
    const cookie = response.get("Set-Cookie")?.[0];
    expect(cookie).toMatch(/^session=.+; Max-Age=86400;/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("rejects an email that is already registered with 409", async () => {
    await register("grace@test.com").expect(201);
    await register("Grace@Test.com").expect(409);
  });

  it("rejects a password shorter than 8 characters with 400", async () => {
    await register("short@test.com", "1234567").expect(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(() => register("alan@test.com", "enigma machine"));

  it("signs in with the right password", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "alan@test.com", password: "enigma machine" })
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", sessionCookie(response))
      .expect(200)
      .expect((me) =>
        expect(me.body).toMatchObject({ email: "alan@test.com" }),
      );
  });

  it("answers a wrong password and an unknown email with the same 401", async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "alan@test.com", password: "wrong password" })
      .expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "enigma machine" })
      .expect(401);

    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the signed-in user", async () => {
    const registered = await register("katherine@test.com");

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", sessionCookie(registered))
      .expect(200, {
        id: (registered.body as { id: string }).id,
        fullName: "Ada Lovelace",
        email: "katherine@test.com",
        role: "user",
      });
  });

  it("rejects a request without a cookie with 401", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("rejects a tampered token with 401", async () => {
    const cookie = sessionCookie(await register("tampered@test.com"));
    const tampered = cookie.slice(0, -2) + (cookie.endsWith("A") ? "BB" : "AA");

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", tampered)
      .expect(401);
  });

  it("rejects an expired token with 401", async () => {
    const registered = await register("expired@test.com");
    const token = await app
      .get(JwtService)
      .signAsync(
        { sub: (registered.body as { id: string }).id, role: "user" },
        { expiresIn: -60 },
      );

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", `session=${token}`)
      .expect(401);
  });

  it("rejects a token signed with another algorithm than HS256 with 401", async () => {
    const registered = await register("hs512@test.com");
    const token = await app
      .get(JwtService)
      .signAsync(
        { sub: (registered.body as { id: string }).id, role: "user" },
        { algorithm: "HS512" },
      );

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", `session=${token}`)
      .expect(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .expect(204);

    expect(response.get("Set-Cookie")?.[0]).toMatch(
      /^session=; .*Expires=Thu, 01 Jan 1970/,
    );
  });
});
