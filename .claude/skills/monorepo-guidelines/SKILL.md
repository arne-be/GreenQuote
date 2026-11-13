---
name: monorepo-guidelines
description: Cross-cutting rules for this pnpm + Turborepo monorepo - where code lives, workspace dependencies, version consistency, shared configs, adding a lint rule, commits. Use when adding a package or dependency, deciding which package a file belongs in, changing lint or tsconfig setup, or writing a commit.
---

# Monorepo guidelines

## Structure

| Layer                  | Path               | Responsibility                                                         |
| ---------------------- | ------------------ | ---------------------------------------------------------------------- |
| Domain & orchestration | `packages/domain`  | Business rules, DB access through Drizzle, shared Zod schemas, errors  |
| HTTP                   | `apps/api`         | Nest modules, controllers, guards, DI wiring, HTTP error mapping       |
| UI                     | `apps/web`         | Next.js pages and components; renders data, holds no business rules    |
| Persistence schema     | `packages/db`      | Drizzle tables, migrations, seed                                       |
| Tooling                | `packages/config`  | Shared ESLint flat config and tsconfig presets                          |

**Default:** new behaviour starts in `packages/domain`. An app adds only the
transport around it. Read `developing-domain-package` when unsure.

## Principles

- Intra-repo dependencies use `workspace:*`, and imports go through the package
  name (`@greenquote/domain`), never a relative path into another package and
  never `dist/`.
- One version of each dependency across the repo. Declare shared versions once
  in the `catalog:` of `pnpm-workspace.yaml` and reference them with
  `"zod": "catalog:"`.
- Shared config lives in `packages/config`; apps extend it rather than copying.
- Turborepo owns the task graph (`build`, `lint`, `types`, `test`) and caches
  it. A new task is added to `turbo.json`, not run ad hoc.
- Scaffold with the framework's generator instead of copy-pasting
  (`pnpm --filter api exec nest g module quotes`).
- Reuse existing schemas, types and components; never duplicate them across
  packages.
- Favour readable code over clever abstractions.

## Lint and format

- ESLint 9 flat config with `typescript-eslint` type-checked rules, run with
  `--max-warnings=0`. Prettier formats; ESLint does not fight it
  (`eslint-config-prettier`). Imports are sorted by
  `eslint-plugin-simple-import-sort`.
- Pre-commit (husky + lint-staged) formats staged files and regenerates any
  committed generated file (an OpenAPI spec) so it never drifts from its source.
  See `setup-pre-commit`.

### Adding a lint rule

- Add it at `error` in `packages/config` (all packages) or in one package's
  `eslint.config.mjs`.
- If code already violates it, record the existing violations instead of fixing
  them by hand: run that package's eslint with `--suppress-rule <rule-id>` and
  commit `eslint-suppressions.json`. Never `--suppress-all`.
- A new violation, or a higher count in a file with suppressions, fails lint.
  When you fix a suppressed violation, run `--prune-suppressions` and commit
  the smaller file.

## CI

One required job: `lint` -> `types` -> `build` -> `test`. On PRs, run only
affected packages: `turbo run test --filter=...[origin/main]`.

## Commits

- Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`,
  `test`, `perf`, `ci`, `build`, `revert`. Scope is the package or area.
- Imperative mood: "add quote list", not "added quote list".
