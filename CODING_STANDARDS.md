# Coding standards

Cross-cutting rules applied at review (the `code-review` skill reads this file).
TypeScript style lives in `developing-typescript`; schema rules in
`managing-database-schema`; layering in `monorepo-guidelines` and
`developing-domain-package`. None is repeated here. Each rule below names what
to look for in a diff.

## 1. Absent values stay null

A missing value is `null`, never coerced to `0`, `""` or a default. The UI
decides how to show it. Optional inputs (a down payment) are `undefined` or
`null` until the domain applies the documented default.

## 2. A filter on a nullable column says what happens to NULL

`WHERE x <> 'a'` silently drops rows where `x` is `NULL`. Either the column is
`NOT NULL` or the query states the intent (`IS NULL OR`, `IS DISTINCT FROM`).

## 3. One source of truth

A constant, schema, type or rule exists once. Flag the second copy: a Zod
schema redeclared in the web app, a price factor typed in both a test and the
code without importing it, a role check repeated in a controller.

## 4. Check the siblings

A fix in one handler, query or component is checked against its siblings (the
list and the detail endpoint, the user and the admin view). If they share the
bug, fix them together or say why not.

## 5. Fallbacks fail closed and keep the cause

On an unknown role, a missing session or an unparsable input, deny or reject.
Never swallow an error: rethrow, or log it with its cause and return an explicit
failure.

## 6. Authorisation lives in the domain

Every read and write of a user's data passes the acting user to the domain
service, which enforces ownership unless the user is an admin. A guard proves
who the caller is; the domain decides what they may see.

## 7. Money and rounding

Amounts are integer minor units (cents) or `numeric`, never `float`/`real`.
Round once, at a documented point, with a named helper. Tests assert exact
values.

## 8. Calendar-day arithmetic names its zone

"Today", "this month" and date boundaries name a time zone explicitly. Store
timestamps as `timestamptz`; format in the UI.

## 9. Logging tells the truth

Log at the level the failure deserves. Structured fields (`{ quoteId, userId }`)
over interpolated strings. Never log passwords, password hashes, session tokens
or full request bodies containing them.

## 10. A removal names who used it

A PR that removes an export, endpoint, column or env var says who called it and
how it proved nothing still does.

## 11. Comments say why

A comment explains a reason the code cannot show. No narrating comments, no
commented-out code, no `TODO` without an issue reference.

## 12. Words come from the glossary

Identifiers, UI copy, API fields and test names use the terms in
`GLOSSARY.md`. A synonym for a defined term is a finding.
