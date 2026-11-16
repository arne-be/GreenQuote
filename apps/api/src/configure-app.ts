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
        .setDescription(
          [
            "Solar financing pre-qualification: request a quote, see its price, risk band and three instalment offers, and list quotes.",
            "",
            "- Money is in euros with at most two decimals (stored as integer cents); `apr` is a fraction (`0.069` is 6.9 %).",
            "- Emails are trimmed and lowercased, so registration and sign-in ignore case.",
            "- Numbers in a quote request may also be sent as strings. Their upper bounds are storage bounds, not business rules.",
            "- Authorisation is checked server-side: a user sees only their own quotes, an admin sees every quote.",
          ].join("\n"),
        )
        .addCookieAuth(SESSION_COOKIE, {
          type: "apiKey",
          in: "cookie",
          description:
            "Register and sign-in set an httpOnly `session` cookie (`SameSite=Lax`, `Secure` in production) holding a signed JWT with the user's id and role, valid for one day; the browser sends it with every request. " +
            "A missing, expired or tampered cookie gives 401. The role is read from the token, so a role change takes effect at the next sign-in.",
        })
        .addGlobalResponse({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          ...errorResponse(
            "Something unexpected failed; the details are only logged",
            { statusCode: 500, message: "Internal server error" },
          ),
        })
        .build(),
    ),
  );
  SwaggerModule.setup("api/docs", app, document);
  return document;
}
