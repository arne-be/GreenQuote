# Agent guidelines

GreenQuote: solar financing pre-qualification. A signed-in user requests a
quote, sees the price, risk band and three instalment offers, and lists their
quotes; admins see every quote. TypeScript monorepo: pnpm + Turborepo.

## Working style

- Surgical changes: every changed line traces to the request. Match existing
  style; remove only what your change orphaned.
- No speculative features or abstractions. Minimum code that solves the problem.
- Define verifiable success criteria (usually a failing test first) and loop
  until they pass. See `tdd`.
- The author must be able to explain every line without AI. Prefer the
  conventional, boring solution over a clever one.
- Follow-up work goes in the issue tracker (`docs/agents/issue-tracker.md`) or
  the README's "What I'd do next", never as `TODO` comments.

## Workflow

Idea → plan → build → review → ship. The full flow, and when to branch off it,
is in `.claude/skills/ask-matt/SKILL.md`.

- **Plan**, while the idea is still foggy: `grill-with-docs`. Multi-session
  work becomes a spec and tickets (GitHub issues) via `to-spec` and
  `to-tickets`. A clear ticket (from `to-tickets`, `triage`, or a small
  well-defined change) starts at Build.
- **Build**: `implement` per ticket (test-first with `tdd`, closed by
  `code-review`), or `implement-spec` for a whole spec.
- **Ship**: one branch per change off `main`, a PR whose body follows `pr`,
  a posted review, its findings fixed, the user's go-ahead, then a squash
  merge (`gh pr merge --squash`). The PR title becomes the squash commit, so
  it is a Conventional Commit. GitHub deletes the branch.
  - **Posted review**: run `code-review` on the PR and post its findings with
    `gh pr review <n> --comment --body-file <file>`. Run and post it again
    whenever later commits change the code.
  - **Findings fixed**: fix each finding on the same branch and get CI green;
    that change triggers the next posted review. Stop when a review leaves
    nothing to fix, or after the third review. Hand these to the user instead,
    each with a one-line reason: findings still open after the third review,
    findings that need a decision (a trade-off, a judgement-call smell, a
    conflict with an ADR or the issue), findings you think are wrong, and a CI
    failure you cannot fix. File out-of-scope findings as issues and link them
    in the hand-over.
  - **Go-ahead**: the user says in chat to merge that PR (GitHub cannot record
    an author's approval of their own PR). Until the review-and-fix loop has
    ended and the user gives the go-ahead, an agent stops at the open PR and
    reports its URL with the handed-over findings.

## Layout

- **apps/web**: Next.js (App Router). UI only. Calls the API; holds no
  business rules.
- **apps/api**: NestJS. Thin facade: controllers, guards, DI wiring, HTTP error
  mapping. All business logic lives in `@greenquote/domain`.
- **packages/domain**: framework-free business logic: pure calculations,
  services, Zod schemas shared by web and api, typed domain errors.
- **packages/db**: Drizzle schema, migrations, seed. The TypeScript schema is the
  source of truth.
- **packages/config**: shared ESLint and tsconfig presets.
- **docs/adr/**: decisions that are hard to reverse. **GLOSSARY.md**: every
  domain word and what it means; read it before naming anything.

## Commands

```bash
pnpm install
docker compose up -d db   # Postgres
pnpm db:migrate && pnpm db:seed
pnpm dev                  # all apps via turbo
pnpm lint                 # eslint --max-warnings=0 everywhere
pnpm format               # prettier
pnpm types                # tsc --noEmit everywhere
pnpm test                 # unit + integration
pnpm test:e2e             # Playwright, separate from pnpm test
```

Update this list when a script is added or renamed.

## Git

- Conventional Commits, enforced by commitlint: `<type>(<scope>): <description>`
  in imperative mood. Scope is the package or area (`feat(api): add quote
endpoint`).
- Small commits that each build and pass tests: reviewers read the PR's
  history.
- Let the pre-commit hook run; never `--no-verify`.

## Rules that always apply

- Name things with the words in `GLOSSARY.md`. A missing word is a gap to fill
  there, never a synonym to coin.
- Authorisation is enforced server-side, in the domain service, never only by
  hiding UI.
- Validate every input at the trust boundary with a Zod schema from
  `@greenquote/domain`. The same schema validates the web form.
- Money is never a float in the database. See `managing-database-schema`.
- Soft-deleted rows are filtered: `WHERE deleted_at IS NULL`.
- Change the TypeScript schema and generate a migration; never hand-edit a
  committed migration or snapshot.
- Secrets live in `.env` (gitignored). `.env.example` lists every variable with
  a dummy value. Config is validated with Zod at startup.
- Review rules live in `CODING_STANDARDS.md`.

## Load before you start

- `monorepo-guidelines`: before adding a package, dependency or lint rule.
- `developing-domain-package`: before writing any business rule, and when
  unsure whether code belongs in the domain or an app.
- `developing-api-app`: for any work in `apps/api`.
- `developing-nextjs-apps`: for any work in `apps/web`.
- `managing-database-schema`: before any schema change, migration or seed.
- `developing-typescript`: for any TypeScript.
- `serialising-concurrent-writes`: before a read whose answer decides a write
  (check-then-insert, find-or-create).
- `engineering-scale-readiness`: when a query or endpoint returns a list.
- Not sure which skill fits: `which-skill`.

## Agent skills

### Issue tracker

GitHub Issues in arne-be/GreenQuote via `gh`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.
