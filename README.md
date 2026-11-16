# GreenQuote

Pre-qualification of residential solar systems for financing. A signed-in user
requests a quote and sees the system price, the risk band and three offers
(5, 10 and 15 year terms). Users list their own quotes; admins see every quote.

The words used here (quote, applicant, offer, risk band, ...) are defined in
[GLOSSARY.md](GLOSSARY.md).

## Prerequisites

- Docker with Compose v2, for the full stack and for the database tests.
- For local development without Docker images: Node 22 or later and pnpm 10
  (`corepack enable` installs the version pinned in `package.json`).

## Run with Docker

```bash
cp .env.example .env
```

```bash
docker compose up --build
```

Compose starts Postgres, runs the migrations and the seed once (the `migrate`
service, which then exits), starts the API and then the web app. When it is up,
open <http://localhost:3000> and sign in as the seeded admin:

- email: `admin@test.com`
- password: the value of `SEED_ADMIN_PASSWORD` in `.env`

The seed also adds three demo users and three quotes each for them and the
admin, so `/quotes` and `/admin/quotes` are not empty:

- emails: `lena@test.com`, `tom@test.com`, `nina@test.com`
- password: the value of `SEED_DEMO_PASSWORD` in `.env`

Set `SEED_DEMO_DATA=false` in `.env` to seed only the admin.

The API is not published on its own port; the web app forwards `/api/*` to it,
so the Swagger UI is at <http://localhost:3000/api/docs>.

## Request a quote

1. Sign in, and you land on `/quotes`. A new user who registers on
   `/register` goes straight to the quote form.
2. Choose **Request a quote**. The applicant's name and email start as your
   own; change them when the quote is for someone else. Fill in the address,
   the monthly consumption in kWh and the system size in kW. The down payment
   is optional.
3. Submit. The quote page shows the system price, the risk band, the APR and
   one offer per term with its monthly payment.

The system price follows from the system size. The risk band follows from the
monthly consumption and the system size, and sets the APR. Each offer is a
fixed monthly payment on the principal (system price minus down payment). The
price per kW, the band thresholds, the APRs and the terms are in
[pricing-rules.ts](packages/domain/src/pricing/pricing-rules.ts).

`/quotes` lists your own quotes, newest first, 20 per page. Admins also get
**All quotes** (`/admin/quotes`), which lists every user's quotes and searches
by user or applicant name and email. A user who opens `/admin/quotes` is sent
back to `/quotes`; the API scopes the list by role either way.

The API image runs with `NODE_ENV=production`, which marks the session cookie
`Secure`. Browsers accept that cookie on `http://localhost`, but not on plain
HTTP from another host name or IP, so open the app on `localhost`.

Ports 3000 (web) and 5432 (Postgres) must be free. To start again from an empty
database, run `docker compose down -v`.

## Run for development

```bash
pnpm install
```

```bash
cp .env.example .env
```

```bash
docker compose up -d db
```

```bash
pnpm db:migrate && pnpm db:seed
```

```bash
pnpm dev
```

The web app runs on <http://localhost:3000> and the API on
<http://localhost:3001> (Swagger UI at <http://localhost:3001/api/docs>). Both
reload on change. Configuration comes from `.env` only: Turborepo does not pass
shell variables through to its tasks, so `DATABASE_URL=... pnpm db:migrate`
still uses the value in `.env`.

## Test

```bash
pnpm lint
```

```bash
pnpm types
```

```bash
pnpm test
```

`pnpm test` runs the unit and integration tests of every package. The database
tests start their own Postgres with Testcontainers, so Docker must be running.
`pnpm format` runs Prettier.

The end-to-end tests drive the web app in Chromium with Playwright: a new user
requests a quote and sees the offers, and the admin finds another user's quote.
They run against a stack that is already up, the Docker one or `pnpm dev`, on
<http://localhost:3000> (set `E2E_BASE_URL` for another address), and read
`SEED_ADMIN_PASSWORD` from `.env`. Install the browser once, then run them:

```bash
pnpm --filter web exec playwright install chromium
```

```bash
pnpm test:e2e
```

CI (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm types`, `pnpm build`
and `pnpm test` on every pull request and on every push to `main`, and in a
second job starts the Docker stack and runs `pnpm test:e2e`. The
pre-commit hook formats the staged files and runs lint, types and tests;
commitlint enforces Conventional Commits.

## How it is built

```text
apps/web          Next.js (App Router): UI only, calls the API
apps/api          NestJS: controllers, session guard, HTTP error mapping
packages/domain   business rules: pricing, services, Zod schemas, typed errors
packages/db       Drizzle schema, migrations, seed
packages/config   shared ESLint and tsconfig presets
```

Every business rule lives in `packages/domain`, which has no framework
dependency; the API is a thin layer over it. The same Zod schema validates a
form in the browser and the request body in the API. The web app proxies
`/api/*` to the API, so the browser sees one origin, the session cookie stays
first party and there is no CORS setup.

The decisions that are hard to reverse are in [docs/adr](docs/adr):

- [0001](docs/adr/0001-jwt-session-cookie.md): sessions are a signed JWT in an
  httpOnly cookie, with no sessions table.
- [0002](docs/adr/0002-quote-snapshot-and-offer-table.md): a quote stores a
  snapshot of its result and the pricing rules version that produced it;
  offers are rows in their own table.
- [0003](docs/adr/0003-role-scoped-quote-list.md): one quote list endpoint,
  scoped by role.

The endpoints, authentication and error responses are described in
[docs/api.md](docs/api.md).

## Trade-offs

- An admin's `/quotes` page shows every quote, not only the admin's own. One
  list endpoint scoped by role is simpler than a separate admin resource
  (ADR 0003).
- The upper limits on quote inputs are storage bounds that keep values inside
  their database columns. They are not business rules about which systems are
  sensible.
- The APR covers interest only. Fees are not modelled, so the monthly payment
  is the interest-and-principal payment at that APR.
- The address is free text, stored as entered. Nothing checks that it exists.

## What I'd do next

- Token revocation or server-side sessions (ADR 0001).
- A `pricing_rules` table instead of constants, so prices and APRs change without a
  deploy (ADR 0002).
- Cursor pagination instead of `limit`/`offset`.
- Address autocomplete and server-side Address Validation. Under GDPR this
  needs a legal basis and a processor agreement, because the addresses go to
  Google.
- Email verification.
- A `pg_trgm` index for the `q` search ([#34](https://github.com/arne-be/GreenQuote/issues/34)).

## CI/CD

CI already runs on every pull request and on `main`. Deploys would run in
GitHub Actions too. Once CI passes, every merge into `main` deploys staging,
and a pull request merged into the `production` branch deploys production.
Each deploy builds the three images (the Dockerfiles already exist),
tags them with the commit SHA, pushes them to a registry, runs the migrate
image as a one-off job, then deploys the API and the web app. Rolling back
means redeploying the previous images, which is why migrations have to stay
backwards compatible for one release.

## Deploying on GCP (Cloud Run)

- Web and API run as two Cloud Run services from the existing images. Only the
  web service is public; the API uses internal ingress and the web service
  reaches it over Direct VPC egress, which keeps the single-origin cookie
  setup.
- `API_URL` is a build argument of the web image, because Next.js builds the
  `/api` rewrite into the bundle, so the web image is built per environment.
- Postgres runs on Cloud SQL, reached over private IP.
- Migrations and the seed run as a Cloud Run job from the `migrate` image
  before each deploy.
- `JWT_SECRET`, the database password and `SEED_ADMIN_PASSWORD` come from
  Secret Manager. Both services already read their port from `PORT`, which
  Cloud Run sets.
- The API logs JSON through pino, which Cloud Logging parses without extra
  setup.
