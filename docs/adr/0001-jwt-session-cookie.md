# Sessions are a signed JWT in an httpOnly cookie

The API signs a JWT holding `{ sub, role }`, valid for 1 day, and sets it in an
httpOnly, `SameSite=Lax` cookie (`Secure` in production). A plain
`SessionGuard` verifies it; there is no Passport and no sessions table. Logout
clears the cookie. We chose this over a sessions table because it needs no
extra table or lookup per request and is small enough to explain line by line.

## Consequences

- A token cannot be revoked before it expires, and a role change takes effect
  only at the next login. The 1-day expiry bounds both.
- Moving to server-side sessions (revocation, instant role changes) means a
  `session` table and a guard that looks it up; the cookie stays the same.
