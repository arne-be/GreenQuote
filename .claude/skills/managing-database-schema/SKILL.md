---
name: managing-database-schema
description: Drizzle ORM schema design, migration workflow, seeding and the safe phased rollout of destructive changes for packages/db (Postgres). Use when creating or changing a table, column, index or enum, writing a migration or seed, storing money, dropping or renaming a column or table, or adding NOT NULL.
---

# packages/db

## Naming

- Tables: plural, `snake_case` (`users`, `quotes`).
- Columns: `snake_case`; TypeScript fields stay camelCase via Drizzle's
  `casing: "snake_case"` option.
- Foreign keys: `<entity>_id`.
- Indexes: `<table>_<column>_index`; unique: `<table>_<column>_unique`.
- Enums: singular, `snake_case` (`risk_band`, `user_role`).

## Every table has

- `id uuid primary key default gen_random_uuid()`: UUIDs for anything exposed.
- `created_at timestamptz not null default now()`.
- `modified_at timestamptz not null default now()`, kept current by Drizzle's
  `$onUpdate(() => new Date())`.
- `deleted_at timestamptz` where rows are soft-deleted. Every query then filters
  `WHERE deleted_at IS NULL`; put that filter in one helper.

A hand-written `UPDATE` (a data migration, a script) sets `modified_at = now()`
itself: only Drizzle's `.update()` stamps it.

## Types

- Money: integer minor units (`integer` cents) or `numeric(12, 2)`. Never `real`
  or `double precision`. Name the column after its unit (`system_price_cents`).
- Rates: `numeric` (`apr numeric(5, 4)` for 0.0690). Drizzle returns `numeric`
  as a string; convert in one mapper.
- Timestamps: `timestamptz`, always.
- Closed sets of values: a Postgres enum, mirrored by a Zod enum in the domain.
- Constraints belong in the database too: `NOT NULL`, `CHECK` (positive sizes,
  non-negative amounts), `UNIQUE` (email, compared case-insensitively via a
  unique index on `lower(email)` or by storing it lower-cased).
- Index every foreign key and every column a list filters or sorts by.

## JSONB

Use only for genuinely nested, read-together data (a list of computed offers
returned as a whole). Define its shape with a Zod schema in the domain and type
the column with `$type<z.infer<typeof schema>>()`. Never a plain TS interface.
JSONB shape changes stay backwards-compatible: add the new variant first, use
it in a later change.

## Migrations

The TypeScript schema is the source of truth.

1. Edit the schema in `packages/db/src/schema/`.
2. `pnpm --filter @greenquote/db migration:generate` (drizzle-kit generate).
3. Read the generated SQL. A fresh migration may be edited before its first
   commit (data backfill, `IF NOT EXISTS`); a committed one is never edited.
4. Commit the migration and the snapshot together.

Never hand-edit a committed migration or snapshot; never use `drizzle-kit push`
outside a throwaway local database. On a rebase conflict, drop your migration
and regenerate it on top of the base.

Migrations run as an explicit step (`pnpm db:migrate`), before the new app
version starts serving.

## Seed

`pnpm db:seed` is idempotent (upsert on a natural key such as email) and creates
the admin user from environment variables, hashing the password with the same
hasher the app uses. Seed data never contains real personal data.

## Destructive changes

Dropping, renaming and adding `NOT NULL` are not backwards-compatible. During a
rolling deploy the old version is still running against the migrated schema, and
Drizzle selects every column it declares, so a single-step drop fails the old
version with `column ... does not exist`.

- **Drop a column:** release 1 stops reading and writing it (explicit `columns:`
  in queries, explicit `.returning({...})`); release 2 removes it from the schema
  and generates the drop.
- **Drop a table:** as above, and stop every writer first.
- **Rename:** never accept a drop-and-recreate. Add the new column, backfill,
  write to both, switch reads, then drop the old one.
- **Add `NOT NULL`:** backfill every row and make every writer set it, then add
  the constraint.

## Tests

Schema and query tests run against a real Postgres (testcontainers), with
migrations applied, never against SQLite or mocks.
