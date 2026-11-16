import type { Server } from "node:http";

import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorisedError,
  ValidationError,
} from "@greenquote/domain";
import { Controller, Get, type INestApplication, Param } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";

import { DomainExceptionFilter } from "./domain-exception.filter.js";

const errors: Record<string, Error> = {
  validation: new ValidationError("bad input"),
  unauthorised: new UnauthorisedError("no session"),
  forbidden: new ForbiddenError("not yours"),
  "not-found": new NotFoundError("missing"),
  conflict: new ConflictError("exists"),
  "unmapped-domain": new DomainError("internal detail"),
  unknown: new Error("internal detail"),
};

@Controller()
class ThrowingController {
  @Get(":kind")
  throw(@Param("kind") kind: string) {
    throw errors[kind] ?? new Error(`unknown kind ${kind}`);
  }
}

describe("DomainExceptionFilter", () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ThrowingController],
      providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["validation", 400, "bad input"],
    ["unauthorised", 401, "no session"],
    ["forbidden", 403, "not yours"],
    ["not-found", 404, "missing"],
    ["conflict", 409, "exists"],
    ["unmapped-domain", 500, "Internal server error"],
    ["unknown", 500, "Internal server error"],
  ])("maps %s to %i", async (kind, statusCode, message) => {
    await request(app.getHttpServer())
      .get(`/${kind}`)
      .expect(statusCode, { statusCode, message });
  });
});
