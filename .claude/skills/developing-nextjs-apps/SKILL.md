---
name: developing-nextjs-apps
description: Next.js (App Router) and React patterns for apps/web - server vs client components, calling the API with the session cookie, forms with shared Zod schemas, route protection, env, styling and accessibility. Use when building or changing pages, components, forms or data fetching in apps/web.
---

# apps/web

The web app renders and collects input. It never computes a price, a risk band
or a permission; it shows what the API returns.

## Talking to the API

- Proxy `/api/*` to the NestJS app with a Next.js rewrite, so the browser sees
  one origin: the session cookie stays first-party and CORS is not needed.
- Server components fetch on the server and forward the incoming `cookie`
  header. Client components call the same-origin `/api/*` path.
- One typed client module (`lib/api.ts`) parses every response with the domain's
  Zod schema. No ad hoc `fetch` scattered through components.
- The API returns data as-is (including `null`); the UI decides how to show it.

## Components

- Server components by default; `"use client"` only where there is state or an
  event handler, as low in the tree as possible.
- Suspense and `loading.tsx` for async boundaries; `error.tsx` for failures;
  `not-found.tsx` for 404s.
- Use `satisfies` for typed config objects; prefer library types over your own.

## Forms

- `react-hook-form` with `zodResolver(schema)`, where `schema` is imported from
  `@greenquote/domain`: one schema for the client check and the server check.
- The server stays authoritative: show the API's validation errors against the
  same fields.
- Pre-fill known values (the signed-in user's name and email) from the session.
- Use shadcn/ui `Form`, `FormField`, `FormLabel`, `FormMessage`, which wire
  labels and errors to inputs accessibly.

## Route protection

- `middleware.ts` redirects requests without a session cookie to `/login` for
  protected routes. This is UX only: the API enforces access.
- Admin pages ask the API, and render its 403 as a page, rather than trusting a
  role flag in the client.

## State

- Server state through server components, or TanStack Query in client
  components, with stable query keys and invalidation after mutations.
- URL state (filters, search on the admin list) in search params, so it is
  shareable and survives reloads.
- Minimal client state.

## Env

`@t3-oss/env-nextjs` with Zod: server and `NEXT_PUBLIC_` variables declared and
validated at build and start. Every variable is in `.env.example`.

## Styling

- Tailwind, mobile first. shadcn/ui and Radix components; `cn()` to merge
  classes. Don't rebuild a component shadcn has (see `shadcn`).
- Theme tokens (`bg-primary`, `text-muted-foreground`), never hard-coded
  colours.
- Format money, numbers and dates with `Intl` in one formatting module.

## Accessibility

- Semantic HTML first: `<main>`, `<nav>`, headings in order, `<table>` with
  `<th scope>` for tabular data, `<label>` for every input.
- Every interaction works by keyboard with a visible focus ring.
- Errors are announced (`aria-live` or the form's `aria-invalid` +
  `aria-describedby`), not shown by colour alone.
- WCAG 2.2 AA contrast. See `impeccable` for design and polish passes.

## Tests

- Component tests with Testing Library for logic-bearing components.
- One Playwright end-to-end test of the main flow: sign in, request a quote,
  see results.
