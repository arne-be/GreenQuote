---
name: developing-domain-package
description: Architecture rules for packages/domain, the framework-free core that holds every business rule - layer placement, service shape, dependency handling, typed errors, shared Zod schemas, tests. Use when writing or changing business logic, adding a service or calculation, or deciding whether code belongs in the domain or in apps/api or apps/web.
---

# @greenquote/domain

The domain package is plain TypeScript. It imports no NestJS, no Next.js and no
HTTP types, so it is testable without booting a framework and reusable from any
entry point (HTTP, a CLI, a seed script, a background job).

## Layer placement

| Belongs in domain                                              | Belongs in an app                                          |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Calculations and rules (pure functions)                        | Nest modules, controllers, guards, exception filters       |
| Queries through Drizzle, orchestration of several steps        | Session and cookie handling, password hashing adapters     |
| Authorisation decisions ("owner or admin")                     | Wiring: `@Inject(DATABASE)`, config, logger                |
| Zod schemas for inputs and outputs, shared by web and api      | Rendering, forms, routing                                  |
| Typed domain errors                                            | Mapping those errors to HTTP status codes                  |
| Unit tests for all of the above                                | Thin wrappers that pass dependencies to domain services    |

Before adding logic under `apps/`, ask: would a second entry point (a CLI, a
job, another controller) need the same rule? If yes, it goes here.

## Layout

```
packages/domain/src/
  <area>/
    <area>.schema.ts     # Zod input/output schemas + inferred types
    <area>.service.ts    # class that reads/writes through Drizzle
    <name>.ts            # pure functions (calculations), no I/O
    <area>.errors.ts     # typed errors, if the area has its own
    __tests__/
  errors.ts              # base DomainError + NotFound/Forbidden/Validation
  index.ts               # the public surface; export new areas here
```

## Services

- A service receives its dependencies in the constructor and stores them as
  `private readonly` fields. Never pass a dependency (`db`, a clock, a logger)
  as a method parameter.
- Accept the Drizzle `Database` type, not a Nest wrapper.
- Depend on the narrowest interface you need: `Pick<Logger, "info" | "error">`,
  a `Clock` with `now()`, a `PasswordHasher` with `hash`/`verify`. That makes
  fakes trivial in tests.
- Interface first: declare the contract, then the implementation.
- Every method that reads or writes user data takes the acting user
  (`{ id, role }`) and enforces access itself.
- Keep calculations pure and separate from the service, so they are unit-tested
  with plain inputs and no database.

```typescript
export interface Actor {
  id: string;
  role: "user" | "admin";
}

export class QuoteService {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock
  ) {}

  async getById(actor: Actor, id: string): Promise<QuoteDto> {
    const quote = await this.findActive(id);
    if (quote === undefined) throw new NotFoundError("Quote not found");
    if (actor.role !== "admin" && quote.userId !== actor.id) {
      throw new NotFoundError("Quote not found"); // don't reveal it exists
    }
    return toQuoteDto(quote);
  }
}
```

## Errors

Throw typed errors (`class NotFoundError extends DomainError`), never match on
message strings. The API maps each class to a status in one exception filter.
The domain never throws HTTP exceptions.

## Schemas

Zod schemas here are the single source of truth for input and output shapes.
`apps/web` uses them for client-side validation, `apps/api` for request
validation and OpenAPI. Schemas contain only fields that are used.

## Tests

Business logic gets thorough unit tests: every branch and boundary of a rule
(each side of a threshold), with exact expected values. Services that query the
database get integration tests against a real Postgres (testcontainers), not a
mocked query builder. See `tdd`.
