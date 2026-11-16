import { SESSION_COOKIE } from "@greenquote/domain";
import { HttpStatus, type INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { errorResponse } from "./common/error-response.js";

/**
 * Shared by main.ts, integration tests and the OpenAPI export so all use the same app.
 * Returns the OpenAPI document it serves.
 */
export function configureApp(app: INestApplication): OpenAPIObject {
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("GreenQuote API")
        .addCookieAuth(SESSION_COOKIE)
        .addGlobalResponse(
          errorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Something unexpected failed; the details are only logged",
            { statusCode: 500, message: "Internal server error" },
          ),
        )
        .build(),
    ),
  );
  SwaggerModule.setup("api/docs", app, document);
  return document;
}
