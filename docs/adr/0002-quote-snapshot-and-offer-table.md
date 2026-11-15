# A quote stores a snapshot of its result

A quote is a record of what the applicant was told. So besides the inputs it
stores the derived system price, risk band and APR, plus the identifier of the
pricing rules version that produced them; offers are rows in their own `offer`
table (term and monthly payment). Recomputing on read would silently change old
quotes whenever the pricing rules change.

The pricing rules are constants in one domain file with a version identifier,
not a database table: every value stays readable in code, and the stored
version plus the stored inputs let anyone recompute and check a quote.

The applicant's full name and email are stored on the quote, separate from the
user who requested it, because a user may request a quote for someone else.

## Considered options

- Offers as `jsonb` on the quote: one insert, no join, but the database cannot
  type-check offer fields and offers cannot be queried on their own.
- A `pricing_rules` table referenced by each quote: lets the business change
  rates without a deploy, at the cost of another table and a lookup per quote.
  The natural next step once non-engineers change rates.

## Consequences

- Principal and each offer's APR and principal are not stored; they are derived
  from the quote's system price, down payment and APR.
- Changing a value in the pricing rules requires bumping its version; a
  snapshot test flags a forgotten bump in review.
