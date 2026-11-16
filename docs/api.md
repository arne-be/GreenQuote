# API reference

All paths start with `/api`. In development the API listens on port 3001; with
Docker Compose it is reachable only through the web app on port 3000, which
forwards `/api/*`.

## OpenAPI document

The API builds its OpenAPI document at startup with `@nestjs/swagger`
(`apps/api/src/configure-app.ts`). Request and response schemas come from the
Zod schemas in `@greenquote/domain` through `nestjs-zod`, so the document
describes the same rules the API validates against. Status codes and their
descriptions come from the `@Api...Response` decorators on each controller
method.

- Swagger UI: `/api/docs`
- JSON document: `/api/docs-json`

Nothing is checked in; the document always matches the running code.

## Authentication

Every route needs a session unless it is marked public below. A session is a
JWT holding the user's id and role, sent in an httpOnly cookie named `session`
(`SameSite=Lax`, `Secure` when `NODE_ENV=production`) and valid for one day.
Register and login set the cookie; logout clears it. A missing, expired or
tampered cookie gives `401`. See [ADR 0001](adr/0001-jwt-session-cookie.md).

Authorisation is checked in the domain services, not in the web app. A role is
read from the token, so a role change takes effect at the next login.

## Errors

Every error body has `statusCode` and `message`:

```json
{ "statusCode": 409, "message": "Email is already registered" }
```

| Status | When                                                                      |
| ------ | ------------------------------------------------------------------------- |
| 400    | The body fails its Zod schema; the body also has `errors`, the Zod issues |
| 401    | No valid session, or wrong email or password                              |
| 403    | Signed in, but not allowed to act on this resource                        |
| 404    | The resource does not exist                                               |
| 409    | The resource conflicts with an existing one (an email already registered) |
| 500    | Anything unexpected; the message is always `Internal server error`        |

A schema failure looks like this:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "path": ["password"],
      "message": "Use at least 8 characters"
    }
  ]
}
```

The domain throws typed errors (`ValidationError`, `UnauthorisedError`,
`ForbiddenError`, `NotFoundError`, `ConflictError`) and
`DomainExceptionFilter` maps them to the statuses above. Unexpected errors are
logged and their details never reach the client.

## Endpoints

### Health

| Method | Path          | Auth   | Responses                |
| ------ | ------------- | ------ | ------------------------ |
| GET    | `/api/health` | public | `200 { "status": "ok" }` |

Liveness only: it does not check the database.

### Auth

| Method | Path                 | Auth    | Body                            | Responses                |
| ------ | -------------------- | ------- | ------------------------------- | ------------------------ |
| POST   | `/api/auth/register` | public  | `{ fullName, email, password }` | `201` user, `400`, `409` |
| POST   | `/api/auth/login`    | public  | `{ email, password }`           | `200` user, `400`, `401` |
| POST   | `/api/auth/logout`   | public  | none                            | `204`                    |
| GET    | `/api/auth/me`       | session | none                            | `200` user, `401`        |

A user is `{ id, fullName, email, role }`, with `role` either `user` or
`admin`. Emails are trimmed and lowercased, so registration is case
insensitive. A password has 8 to 128 characters and no composition rules.
Login answers `401` with the same message for an unknown email and a wrong
password. Logout is public so that a browser with an expired cookie can still
clear it.

### Quotes

> **Not yet documented.** The quote endpoints are being built in [#9](https://github.com/arne-be/GreenQuote/issues/9) (request a
> quote) and [#10](https://github.com/arne-be/GreenQuote/issues/10) (quote lists). This section will list `POST /api/quotes`,
> `GET /api/quotes` and `GET /api/quotes/:id` once they are on `main`.
>
> `GET /api/quotes` will be scoped by role: a user gets their own quotes and an
> admin gets every quote ([ADR 0003](adr/0003-role-scoped-quote-list.md)).
