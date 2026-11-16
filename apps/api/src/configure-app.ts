import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";

/** Shared by main.ts and integration tests so both serve the same app. */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix("api");
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("GreenQuote API").build(),
  );
  SwaggerModule.setup("api/docs", app, cleanupOpenApiDoc(document));
}
