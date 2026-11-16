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
| 400    | The body or query fails its Zod schema, or a path id is not a UUID        |
| 401    | No valid session, or wrong email or password                              |
| 403    | Mapped from `ForbiddenError`; no endpoint returns it today                |
| 404    | The resource does not exist, or the caller may not see it                 |
| 409    | The resource conflicts with an existing one (an email already registered) |
| 500    | Anything unexpected; the message is always `Internal server error`        |

A schema failure adds `errors`, the Zod issues, each with the `path` of the
field it is about:

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

A rule the domain checks itself, such as a down payment above the system
price, uses the same `errors` shape. A path id that is not a UUID gets Nest's
own body instead: `{ "statusCode": 400, "message": "Validation failed (uuid is
expected)", "error": "Bad Request" }`.

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

| Method | Path              | Auth    | Body or query        | Responses                        |
| ------ | ----------------- | ------- | -------------------- | -------------------------------- |
| POST   | `/api/quotes`     | session | quote input          | `201` quote, `400`, `401`        |
| GET    | `/api/quotes/:id` | session | none                 | `200` quote, `400`, `401`, `404` |
| GET    | `/api/quotes`     | session | `?q=&limit=&offset=` | `200` quote list, `400`, `401`   |

Money is in euros with at most two decimals (stored as integer cents), and the
APR is a fraction (`0.069` is 6.9 %).

#### Request a quote

`POST /api/quotes` prices the inputs with the current pricing rules, stores the
quote with its result and offers, and returns it. The signed-in user owns the
quote; the applicant can be someone else.

```json
{
  "fullName": "Ada Lovelace",
  "email": "ada@test.com",
  "address": "12 St James Square, London",
  "monthlyConsumptionKwh": 450,
  "systemSizeKw": 5,
  "downPayment": 1000
}
```

| Field                   | Rule                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `fullName`              | 1 to 200 characters                                               |
| `email`                 | a valid email; trimmed and lowercased                             |
| `address`               | 5 to 300 characters, free text                                    |
| `monthlyConsumptionKwh` | whole kWh, above 0, at most 1,000,000                             |
| `systemSizeKw`          | above 0, at most 10,000, at most 2 decimals                       |
| `downPayment`           | optional; 0 or more, at most 2 decimals, at most the system price |

Numbers may also be sent as strings (the web form does). The upper bounds keep
values inside their database columns; they are not eligibility rules.

#### The quote

`POST /api/quotes` and `GET /api/quotes/:id` return the same shape:

```json
{
  "id": "5de0294b-9bb5-4b53-8eae-df3583f77588",
  "createdAt": "2026-11-16T19:50:30.522Z",
  "fullName": "Ada Lovelace",
  "email": "ada@test.com",
  "address": "12 St James Square, London",
  "monthlyConsumptionKwh": 450,
  "systemSizeKw": 5,
  "downPayment": 1000,
  "systemPrice": 6000,
  "principal": 5000,
  "riskBand": "A",
  "apr": 0.069,
  "offers": [
    {
      "termYears": 5,
      "apr": 0.069,
      "principalUsed": 5000,
      "monthlyPayment": 98.77
    },
    {
      "termYears": 10,
      "apr": 0.069,
      "principalUsed": 5000,
      "monthlyPayment": 57.8
    },
    {
      "termYears": 15,
      "apr": 0.069,
      "principalUsed": 5000,
      "monthlyPayment": 44.66
    }
  ]
}
```

`downPayment` is `0` when none was given. Offers are ordered by term, shortest
first.

`GET /api/quotes/:id` returns the quote to the user who requested it and to any
admin. For everyone else it answers `404`, the same as for an id that does not
exist, so the response does not reveal which quote ids exist.

#### List quotes

`GET /api/quotes` is scoped by role: a user gets only their own quotes, an
admin gets every quote ([ADR 0003](adr/0003-role-scoped-quote-list.md)). The
web app's `/quotes` and `/admin/quotes` pages both call it.

| Query    | Rule                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `q`      | optional, at most 100 characters; matches the requesting user's and the applicant's name and email, ignoring case |
| `limit`  | 1 to 100, default 20                                                                                              |
| `offset` | 0 or more, default 0                                                                                              |

```json
{
  "items": [
    {
      "id": "5de0294b-9bb5-4b53-8eae-df3583f77588",
      "createdAt": "2026-11-16T19:50:30.522Z",
      "fullName": "Ada Lovelace",
      "email": "ada@test.com",
      "systemSizeKw": 5,
      "systemPrice": 6000,
      "riskBand": "A",
      "user": { "fullName": "Ada Lovelace", "email": "ada@test.com" }
    }
  ],
  "total": 1
}
```

Items are newest first. `fullName` and `email` are the applicant's; `user` is
who requested the quote. `total` counts every match across all pages, so a
client can page with `offset`.
