import { calculateQuoteResult } from "@greenquote/domain";
import type { OpenAPIObject } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { beforeAll, expect, it } from "vitest";

import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

let document: OpenAPIObject;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  document = configureApp(app);
  await app.close();
});

it("documents every operation with a summary and every error with the shared schema and an example", () => {
  const operations = Object.entries(document.paths).flatMap(([path, item]) =>
    (["get", "post", "put", "patch", "delete"] as const).flatMap((method) =>
      item[method] ? [{ name: `${method} ${path}`, ...item[method] }] : [],
    ),
  );
  expect(operations.length).toBeGreaterThan(0);
  for (const operation of operations) {
    expect(operation.summary, operation.name).toBeTruthy();
    for (const [status, response] of Object.entries(operation.responses)) {
      if (Number(status) < 400) continue;
      expect(response, `${operation.name} ${status}`).toMatchObject({
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponseDto" },
            example: expect.anything() as unknown,
          },
        },
      });
    }
  }
});

it("prices the quote example with the current pricing rules", () => {
  const result = calculateQuoteResult({
    systemSizeKw: 5,
    monthlyConsumptionKwh: 450,
    downPaymentCents: 100_000,
  });
  const response = document.paths["/api/quotes"]?.post?.responses["201"];

  expect(response).toHaveProperty("content.application/json.example");
  expect(
    (response as { content: Record<string, { example: unknown }> }).content[
      "application/json"
    ]?.example,
  ).toMatchObject({
    systemSizeKw: 5,
    monthlyConsumptionKwh: 450,
    downPayment: 1000,
    systemPrice: result.systemPriceCents / 100,
    principal: result.principalCents / 100,
    riskBand: result.riskBand,
    apr: result.apr,
    offers: result.offers.map((offer) => ({
      termYears: offer.termYears,
      apr: offer.apr,
      principalUsed: offer.principalCents / 100,
      monthlyPayment: offer.monthlyPaymentCents / 100,
    })),
  });
});
