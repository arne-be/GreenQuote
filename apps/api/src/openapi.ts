import { writeFile } from "node:fs/promises";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

// Builds the app without listening and writes the document it serves to docs/openapi.json.
const app = await NestFactory.create(AppModule, { bufferLogs: true });
const document = configureApp(app);
await writeFile(
  new URL("../../../docs/openapi.json", import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
);
await app.close();
