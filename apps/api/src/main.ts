import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import type { Env } from "./config/env.js";
import { configureApp } from "./configure-app.js";

const app = await NestFactory.create(AppModule, { bufferLogs: true });
configureApp(app);
await app.listen(
  app.get(ConfigService<Env, true>).get("PORT", { infer: true }),
);
