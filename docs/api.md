# API reference

All paths start with `/api`. In development the API listens on port 3001; with
Docker Compose it is reachable only through the web app on port 3000, which
forwards `/api/*`.

## OpenAPI document

Every endpoint, its request and response schemas, status codes, error bodies
and examples are in the OpenAPI document:

- Committed: [`openapi.json`](openapi.json), so a PR diff shows every API change.
- Swagger UI: `/api/docs` on a running API.
- JSON: `/api/docs-json` on a running API.

The API builds the document at startup with `@nestjs/swagger`
(`configureApp` in `apps/api/src/configure-app.ts`). Schemas come from the Zod
schemas in `@greenquote/domain` through `nestjs-zod`, so the document describes
the same rules the API validates against. `pnpm openapi` writes the committed
copy from the same `configureApp`, without a database or listening. The
pre-commit hook runs it, and CI fails if the committed file differs from a
fresh build.

Swagger UI stays on in production: the document reveals nothing a client
could not learn by calling the API, and every data endpoint needs a session.

## Authentication

Every route needs a session unless it is marked public. A session is a JWT
holding the user's id and role, sent in an httpOnly cookie named `session`
(`SameSite=Lax`, `Secure` when `NODE_ENV=production`) and valid for one day.
Register and login set the cookie; logout clears it. A missing, expired or
tampered cookie gives `401`. See [ADR 0001](adr/0001-jwt-session-cookie.md).

Authorisation is checked in the domain services, not in the web app. A role is
read from the token, so a role change takes effect at the next login. The
quote list is scoped by role
([ADR 0003](adr/0003-role-scoped-quote-list.md)).

## Errors

The domain throws typed errors (`ValidationError`, `UnauthorisedError`,
`ForbiddenError`, `NotFoundError`, `ConflictError`) and
`DomainExceptionFilter` maps them to 400, 401, 403, 404 and 409 (`403` is not
used by any endpoint yet). A Zod schema failure is a 400 from `nestjs-zod`'s
pipe, with the same `errors` shape. Unexpected errors are logged and answer
`500` with the message `Internal server error`; their details never reach the
client.

## Conventions

- Money is in euros with at most two decimals (stored as integer cents), and
  the APR is a fraction (`0.069` is 6.9 %).
- Emails are trimmed and lowercased, so registration is case insensitive.
- Numbers in a quote request may also be sent as strings (the web form does).
  The upper bounds are storage bounds (see the README trade-offs).
