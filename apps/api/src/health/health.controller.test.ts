import type { Server } from "node:http";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";

import { AppModule } from "../app.module.js";
import { configureApp } from "../configure-app.js";

describe("GET /api/health", () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200", async () => {
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(200, { status: "ok" });
  });
});
