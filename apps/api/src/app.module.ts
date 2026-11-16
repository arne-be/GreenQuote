import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";

import { AuthModule } from "./auth/auth.module.js";
import { DomainExceptionFilter } from "./common/domain-exception.filter.js";
import { validateEnv } from "./config/env.js";
import { DatabaseModule } from "./database.module.js";
import { HealthController } from "./health/health.controller.js";
import { QuotesModule } from "./quotes/quotes.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(import.meta.dirname, "../../../.env"),
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: () => randomUUID(),
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
          "*.password",
        ],
      },
    }),
    DatabaseModule,
    AuthModule,
    QuotesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
