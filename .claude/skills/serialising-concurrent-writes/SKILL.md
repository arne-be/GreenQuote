---
name: serialising-concurrent-writes
description: Closing read-then-write races in Postgres - check-then-insert, find-or-create, recompute-and-replace - with a unique constraint or a transaction-scoped advisory lock, publishing side effects after commit, and proving the fix with a test that goes red. Use when a read decides a write, when two requests can write the same rows, or when reviewing such code.
---

# Serialising concurrent writes

Under `READ COMMITTED` (Postgres's default), a transaction does not stop a
second request from reading the same "nothing there yet" and writing too. Any
read whose answer decides a write is a race until something serialises both.

## 1. Find every race

Trace each write back to the reads that decide it: check-then-insert,
find-or-create, delete-then-reinsert, recompute-and-replace, a payload built
from earlier reads. Include reads inside helpers and before the transaction.

## 2. Prefer a constraint

If a unique index expresses the invariant and one loser is acceptable, let the
database reject the duplicate and map the violation (Postgres `23505`) to a
domain `ConflictError`. Registering with an email that already exists is this
case: a unique index on the normalised email, not a "does it exist?" query
first. A constraint also binds writers that never take your lock.

An upsert with no read-derived branch (`ON CONFLICT DO UPDATE`) is already
safe.

## 3. Otherwise, lock the critical section

```typescript
await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
  const [existing] = await tx.select().from(table).where(/* … */);
  if (existing) return existing;
  return tx.insert(table).values(/* … */).returning();
});
```

- Use `pg_advisory_xact_lock`: Postgres releases it on commit or rollback. A
  session-level lock stays held on a pooled connection when a path throws.
- The lock is the first statement; every read you branch on comes after it, on
  `tx`.
- The key is a namespace plus the widest set of rows the section touches
  (`quote-recompute:<userId>`). Every writer of those rows takes the same key.
- A helper that must run inside the lock takes `tx` as a required parameter.
- Paths that write the same tables lock them in the same order, or they
  deadlock.
- Keep `READ COMMITTED` plus a lock; `SERIALIZABLE` needs every caller to retry.

## 4. Publish after commit

An email, a job or a webhook sent inside an open transaction lets the consumer
read before the write is visible, or announces a write that then rolls back.
Collect side effects and run them after the transaction resolves.

## 5. Prove it red

A concurrency test counts only if it fails with the fix removed. Widen the race
window (delay the protected read in a test subclass), start both callers with
`Promise.allSettled`, and assert the invariant on the rows in the table (one
row), not on which call threw. It needs a real Postgres (testcontainers).
