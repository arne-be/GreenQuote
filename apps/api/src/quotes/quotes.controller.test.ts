import type { Server } from "node:http";

import { createDb, type Db, migrateDb } from "@greenquote/db";
import type { QuoteList } from "@greenquote/domain";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../app.module.js";
import { configureApp } from "../configure-app.js";
import { DATABASE } from "../database.module.js";

let container: StartedPostgreSqlContainer;
let db: Db;
let app: INestApplication<Server>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  db = createDb(container.getConnectionUri());
  await migrateDb(db);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE)
    .useValue(db)
    .compile();
  app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
}, 120_000);

afterAll(async () => {
  await app.close();
  await db.$client.end();
  await container.stop();
});

const input = {
  fullName: "Ada Lovelace",
  email: "ada@test.com",
  address: "Musterstraße 1, 10115 Berlin",
  monthlyConsumptionKwh: 450,
  systemSizeKw: 6,
  downPayment: 1000,
};

const signIn = async (email: string) => {
  const response = await request(app.getHttpServer())
    .post("/api/auth/register")
    .send({ fullName: "Ada Lovelace", email, password: "correct horse" })
    .expect(201);
  return (response.get("Set-Cookie")?.[0] ?? "").split(";")[0] ?? "";
};

const requestQuote = (cookie: string, body: object = input) =>
  request(app.getHttpServer())
    .post("/api/quotes")
    .set("Cookie", cookie)
    .send(body);

describe("POST /api/quotes", () => {
  it("rejects a request without a session with 401", async () => {
    await request(app.getHttpServer())
      .post("/api/quotes")
      .send(input)
      .expect(401);
  });

  it("rejects invalid input with 400 and the fields at fault", async () => {
    const cookie = await signIn("invalid@test.com");

    const response = await requestQuote(cookie, {
      ...input,
      address: "1",
      systemSizeKw: 0,
    }).expect(400);

    const paths = (response.body as { errors: { path: string[] }[] }).errors
      .map((error) => error.path.join("."))
      .sort();
    expect(paths).toEqual(["address", "systemSizeKw"]);
  });

  it("rejects a down payment above the system price with 400 on downPayment", async () => {
    const cookie = await signIn("down-payment@test.com");

    const response = await requestQuote(cookie, {
      ...input,
      downPayment: 7200.01,
    }).expect(400);

    expect(response.body).toMatchObject({
      errors: [{ path: ["downPayment"] }],
    });
  });

  it("returns the quote with three offers and persists them", async () => {
    const cookie = await signIn("happy@test.com");

    const created = await requestQuote(cookie).expect(201);

    // 6 kW at €1,200 is €7,200; minus €1,000 down leaves €6,200 at risk band A's 6.9 %.
    const expected = {
      id: expect.any(String) as string,
      createdAt: expect.any(String) as string,
      ...input,
      systemPrice: 7200,
      principal: 6200,
      riskBand: "A",
      apr: 0.069,
      offers: [
        {
          termYears: 5,
          apr: 0.069,
          principalUsed: 6200,
          monthlyPayment: 122.48,
        },
        {
          termYears: 10,
          apr: 0.069,
          principalUsed: 6200,
          monthlyPayment: 71.67,
        },
        {
          termYears: 15,
          apr: 0.069,
          principalUsed: 6200,
          monthlyPayment: 55.38,
        },
      ],
    };
    expect(created.body).toEqual(expected);
    await request(app.getHttpServer())
      .get(`/api/quotes/${(created.body as { id: string }).id}`)
      .set("Cookie", cookie)
      .expect(200, created.body);
  });
});

describe("GET /api/quotes/:id", () => {
  it("answers another user's quote with 404", async () => {
    const owner = await signIn("owner@test.com");
    const other = await signIn("other@test.com");
    const { body } = (await requestQuote(owner).expect(201)) as {
      body: { id: string };
    };

    await request(app.getHttpServer())
      .get(`/api/quotes/${body.id}`)
      .set("Cookie", other)
      .expect(404);
  });

  it("lets an admin read any quote", async () => {
    const owner = await signIn("someone@test.com");
    const { body } = (await requestQuote(owner).expect(201)) as {
      body: { id: string };
    };
    const admin = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        fullName: "Admin",
        email: "admin@test.com",
        password: "correct horse",
      })
      .expect(201);
    // Registration only makes users; sign the admin's session directly.
    const token = await app
      .get(JwtService)
      .signAsync({ sub: (admin.body as { id: string }).id, role: "admin" });

    await request(app.getHttpServer())
      .get(`/api/quotes/${body.id}`)
      .set("Cookie", `session=${token}`)
      .expect(200, body);
  });

  it("rejects an id that is not a UUID with 400", async () => {
    const cookie = await signIn("not-uuid@test.com");

    await request(app.getHttpServer())
      .get("/api/quotes/not-a-uuid")
      .set("Cookie", cookie)
      .expect(400);
  });
});

describe("GET /api/quotes", () => {
  const listQuotes = (cookie: string, query = "") =>
    request(app.getHttpServer())
      .get(`/api/quotes${query}`)
      .set("Cookie", cookie);

  it("rejects a request without a session with 401", async () => {
    await request(app.getHttpServer()).get("/api/quotes").expect(401);
  });

  it("rejects a limit or offset out of range with 400", async () => {
    const cookie = await signIn("bad-query@test.com");
    for (const query of ["?limit=0", "?limit=101", "?offset=-1", "?limit=a"]) {
      await listQuotes(cookie, query).expect(400);
    }
  });

  it("shows a user only their own quotes and an admin everyone's", async () => {
    const first = await signIn("lister-one@test.com");
    const second = await signIn("lister-two@test.com");
    await requestQuote(first).expect(201);
    await requestQuote(first).expect(201);
    await requestQuote(second).expect(201);
    const { body: adminUser } = (await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        fullName: "List Admin",
        email: "list-admin@test.com",
        password: "correct horse",
      })
      .expect(201)) as { body: { id: string } };
    const token = await app
      .get(JwtService)
      .signAsync({ sub: adminUser.id, role: "admin" });

    const own = (await listQuotes(first).expect(200)) as { body: QuoteList };
    const everyone = (await listQuotes(`session=${token}`, "?limit=100").expect(
      200,
    )) as { body: QuoteList };
    const searched = await listQuotes(`session=${token}`, "?q=lister-").expect(
      200,
    );

    expect(own.body.total).toBe(2);
    expect(own.body.items.map((item) => item.user.email)).toEqual([
      "lister-one@test.com",
      "lister-one@test.com",
    ]);
    expect(everyone.body.items.map((item) => item.user.email)).toEqual(
      expect.arrayContaining(["lister-one@test.com", "lister-two@test.com"]),
    );
    expect(searched.body).toMatchObject({ total: 3 });
  });
});

describe("OpenAPI document", () => {
  it("describes and bounds the quote fields", async () => {
    const { body } = (await request(app.getHttpServer())
      .get("/api/docs-json")
      .expect(200)) as {
      body: { components: { schemas: Record<string, unknown> } };
    };

    expect(body.components.schemas).toMatchObject({
      QuoteInputDto: {
        properties: {
          systemSizeKw: {
            description: "The rated power of the solar system, in kW",
            maximum: 10_000,
          },
        },
      },
      QuoteDto: {
        properties: {
          systemPrice: { minimum: 0, maximum: 12_000_000 },
          offers: { minItems: 3, maxItems: 3 },
        },
      },
    });
  });
});
