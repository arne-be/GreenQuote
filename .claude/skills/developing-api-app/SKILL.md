---
name: developing-api-app
description: NestJS guidelines for apps/api, the thin HTTP facade over packages/domain - module layout, service wrappers, controllers, auth guards, validation, error mapping, OpenAPI, logging, config, health, and the optional API/worker split. Use when adding or changing a module, controller, guard, DTO or endpoint in apps/api.
---

# apps/api

The API is a thin facade. Business logic, queries and authorisation decisions
live in `@greenquote/domain`; the API adds transport: routing, DI, sessions,
validation at the edge and HTTP error mapping.

## Module layout

Scaffold with `nest g module|controller|service <name>`.

```
apps/api/src/
  modules/<area>/
    <area>.module.ts
    <area>.controller.ts
    <area>.service.ts        # wraps the domain service
    <area>.controller.spec.ts
  auth/                      # guards, session, decorators
  common/                    # exception filter, logger setup
  config/                    # Zod-validated env
  health/
  app.module.ts
  main.ts
```

## Service wrapper

The Nest service extends the domain service and passes infrastructure in
through DI. Never `new` a domain service inside a controller.

```typescript
@Injectable()
export class QuotesService extends QuoteService {
  constructor(@Inject(DATABASE) db: Database, @Inject(CLOCK) clock: Clock) {
    super(db, clock);
  }
}
```

Override a method only when the API must add something transport-specific.

## Controllers

- Same decorator stack on every controller, in this order:

```typescript
@UseGuards(SessionGuard)
@ApiTags("quotes")
@ApiCookieAuth()
@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get(":id")
  @ApiOkResponse({ type: QuoteResponseDto })
  @ApiNotFoundResponse({ description: "Quote does not exist or is not yours" })
  findOne(@CurrentUser() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    return this.quotes.getById(actor, id);
  }
}
```

- Controllers parse, delegate and return. No business rules, no queries, no
  role checks beyond "is there a session" and "is this an admin route".
- Public routes (health, register, login) are marked explicitly
  (`@Public()`), so a forgotten guard fails closed.
- Response field names match the spec the API publishes. Keep one casing for
  the JSON contract and convert at the edge if the domain differs.

## Validation and DTOs

- Every input is validated at the edge with the Zod schema from the domain
  package (`nestjs-zod`'s `createZodDto` + `ZodValidationPipe`), so the OpenAPI
  document and the runtime check come from one schema.
- Every endpoint, parameter and field has an OpenAPI description that adds
  something beyond the field name. Document every error response.
- Dates are ISO 8601 strings (`format: date-time`). Add `min`/`max` to numbers,
  strings and arrays.

## Errors

One global exception filter maps domain error classes to HTTP:
`ValidationError` -> 400, `UnauthorisedError` -> 401, `ForbiddenError` -> 403,
`NotFoundError` -> 404, `ConflictError` -> 409. Everything else is a 500 that
logs the cause and returns a generic message. Do not catch errors just to
rethrow them.

## Auth

- Guards establish identity from the session (signed, httpOnly, `SameSite=Lax`,
  `Secure` in production cookie, or a JWT in one). A `@CurrentUser()` decorator
  hands the `Actor` to the controller.
- An `AdminGuard` protects admin routes, and the domain still checks the role:
  defence in depth, enforced server-side.
- Passwords are hashed with argon2 or bcrypt; never logged or returned.
  Login failures return the same message for unknown email and wrong password.

## Config, logging, health

- Config is read once through `ConfigModule` with a Zod `validate` function;
  the app refuses to boot on a missing or malformed variable. Every variable is
  in `.env.example`.
- Structured JSON logs (`nestjs-pino`): one line per request with method, path,
  status, duration and a request id; errors logged with their stack. Redact
  `authorization`, `cookie` and password fields.
- `GET /api/health` returns 200 when the process is up; checking the database
  is a readiness concern, kept separate if added.

## API / worker split (only when background jobs exist)

If the app gains workers (queues, cron), run one codebase in modes chosen by
`SERVICE_MODE` (`api`, `worker`, `both`), resolved once at import time:

- `controllers: isApiMode() ? [XController] : []`
- `providers: [XService, ...(isWorkerMode() ? [XWorker] : [])]`
- HTTP middleware, filters and OpenAPI are registered only in API mode.

One image, scaled separately as API and as workers.

## Tests

- Unit-test controllers only when they hold logic; most logic is tested in the
  domain.
- Integration tests boot the Nest app against a real Postgres (testcontainers)
  and hit it with `supertest`: auth required, ownership enforced, admin access,
  validation errors, the happy path.
