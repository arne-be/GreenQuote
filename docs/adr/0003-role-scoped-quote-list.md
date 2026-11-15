# One quote list endpoint, scoped by role

`GET /api/quotes` returns the caller's own quotes for a user and every quote
for an admin, with optional `q` search (user and applicant name and email) and
`limit`/`offset` pagination. Both web pages, `/quotes` and `/admin/quotes`, use
it. We chose one resource scoped by permission over an `/api/admin/quotes`
endpoint, because a role does not belong in a resource path and the scoping
matches `GET /api/quotes/:id`. The implicit filtering is documented in the API
reference.

## Consequences

- Deliberate deviation from the challenge: an admin's `/quotes` page shows all
  quotes, not only the admin's own. A `userId` filter would restore "my quotes"
  for admins.
- The scope is a single line in the domain service; a unit test proves a user
  never sees another user's quote under any combination of filters.
