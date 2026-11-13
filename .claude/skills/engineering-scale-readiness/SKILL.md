---
name: engineering-scale-readiness
description: Checklist for code that will not fall over as data grows - pagination, N+1 queries, unbounded fan-out, missing indexes, unbounded growth, measurability. Use when an endpoint or query returns a list, when writing loops that do I/O, when reviewing a diff for performance, or when asked "does this scale?".
---

# Engineering scale readiness

Habits that compound, applied to new code and code you touch. Do not rewrite
untouched code for them.

## Commitments

1. **Paginate growing collections.** Any list that can exceed ~30 items (a
   user's quotes, all quotes for an admin) takes `limit` + cursor or offset with
   a hard maximum, applied in the domain query, not only in the controller.
2. **Bound every query.** A `WHERE`, a `LIMIT`, and an index that serves both
   the filter and the sort.
3. **Batch, don't loop.** One `WHERE id IN (...)` or a join instead of a query
   per item.
4. **Cap fan-out.** `Promise.all` over a data-sized array gets a concurrency
   limit or chunking; use `Promise.allSettled` when one failure should not
   abort the batch.
5. **Keep slow work off the request path.** PDF generation, emails and reports
   run as background work once they are slow, not inside a request.
6. **Cache only stable lookups**, with a TTL.
7. **Decide retention** when a table grows without bound.
8. **Measure.** Request duration in logs now; p50/p95/p99 on critical paths
   once metrics exist.

## Red flags

| Signal                       | Look for                                                      | Fix                                   |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| Full collection load         | `findMany()` / `select()` with no `limit`                     | Paginate, add max page size           |
| N+1                          | `await` a query or fetch inside `for` / `.map`                | `inArray`, join, or batch loader      |
| Unbounded `Promise.all`      | `Promise.all(rows.map(...))` with I/O                         | `p-limit` or chunks                   |
| `async` in `forEach`         | `forEach(async ...)`                                          | `for...of` or bounded `Promise.all`   |
| Missing index                | Filter or sort on an unindexed column; FK without index       | Add index in the schema               |
| Filtering in JS              | Load rows, then `.filter` / `.sort` in code                   | Move into the SQL                     |
| Search with leading wildcard | `ILIKE '%term%'` on a large table                             | Prefix match, trigram index, or limit |

## Quick checks

```bash
rg 'Promise\.all\(' packages apps --glob '*.ts'
rg 'forEach\s*\(\s*async' packages apps --glob '*.ts'
rg 'findMany\(|\.select\(\)' packages --glob '*.ts'
```

Interpret in context: tests and seed scripts are often false positives.

## Review output

Cite the file and symbol, classify it against the table, say who waits (the
user, the database), and suggest the smallest fix.
