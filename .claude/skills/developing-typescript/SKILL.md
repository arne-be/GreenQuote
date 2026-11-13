---
name: developing-typescript
description: TypeScript style, naming, type safety, Zod validation, date handling and async patterns for this repo. Use when writing or reviewing any .ts or .tsx file.
---

# TypeScript

## Style

- Functional, declarative code; early returns over nesting.
- File order: exports, then types, then implementation.
- Comments only for what the code cannot say (see `CODING_STANDARDS.md`).
- `strict: true` and `noUncheckedIndexedAccess: true` in the shared tsconfig.

## Naming

- Booleans start with `is`/`has`/`can` (`isAdmin`).
- JSX event handlers start with `handle` (`onSubmit={handleSubmit}`); other
  functions are named for what they do.
- Generics are descriptive and constrained: `TData extends object`.
- Domain words come from `GLOSSARY.md`.

## Type safety

- No `any`, no non-null `!`. Narrow with control flow
  (`if (x === undefined) return`), type guards or `satisfies`.
- In tests, `expect(x).toBeDefined()` plus `if (x === undefined) throw` so
  TypeScript narrows.
- Infer types from Zod schemas (`z.infer`) instead of writing them twice.
- Tuples for fixed-length arrays; discriminated unions for variants.

## Validation (Zod)

- Every value crossing a trust boundary (request body, query string, env,
  JSON from the database, `localStorage`) is parsed with Zod.
- Schemas contain only the fields that are used.
- Coerce form strings to numbers in the schema (`z.coerce.number()`), not by
  hand.

## Dates

- `date-fns` v4 (with `@date-fns/tz` when a zone matters) for all date
  arithmetic.
- Compute boundaries in TypeScript and pass `Date` objects to Drizzle; never
  build SQL intervals by string interpolation.

## Async

- `async`/`await` over promise chains. Fire-and-forget is explicit:
  `void doThing()`.
- `Promise.all` for independent calls; bound its width when the input is
  data-sized (see `engineering-scale-readiness`).
- Prefer SQL for filtering, joining and aggregating over loops in JavaScript.

## Numbers

- Money in integer minor units; convert to a display string only in the UI with
  `Intl.NumberFormat`.
- Round with one named helper at one documented point; never `toFixed` in
  business logic.
