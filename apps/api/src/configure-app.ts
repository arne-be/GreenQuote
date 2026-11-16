import { SESSION_COOKIE } from "@greenquote/domain";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";

/** Shared by main.ts and integration tests so both serve the same app. */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("GreenQuote API")
      .addCookieAuth(SESSION_COOKIE)
      .build(),
  );
  SwaggerModule.setup("api/docs", app, cleanupOpenApiDoc(document));
}
