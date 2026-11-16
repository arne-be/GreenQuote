import { Test } from "@nestjs/testing";
import { expect, it } from "vitest";

import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

it("documents every operation with a summary and every error with the shared schema and an example", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  const document = configureApp(app);
  await app.close();

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
