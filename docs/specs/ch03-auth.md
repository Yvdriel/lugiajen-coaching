# Ch3 — Auth & app shell

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch3).
> This file records what was built + decisions.

## Scope

Coach login (email/password), `(coach)` route-group guard + app shell (sidebar/nav),
and a dashboard rendering real seeded stats. `auth.ts` itself was front-loaded in Ch2.

## Files

- `src/app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)`.
- `src/lib/auth-client.ts` — `createAuthClient()` (origin-inferred baseURL; no server env → client-safe).
- `src/app/(auth)/login/` — `schema.ts` (zod), `actions.ts` (server action), `login-form.tsx` (client RHF), `page.tsx`.
- `src/app/(coach)/layout.tsx` — getSession guard + shell.
- `src/components/layout/{sidebar,nav-user}.tsx` — nav links + sign-out.
- `src/app/(coach)/dashboard/page.tsx` + `src/lib/queries/dashboard.ts` (convention 4).
- `src/app/page.tsx` → redirect `/dashboard`; removed `page.test.tsx`.

## Decisions / deviations

- **Login = server action** (convention 2): zod-validate → `auth.api.signInEmail` →
  `redirect('/dashboard')` on success (outside try/catch); typed `{ok, fieldErrors?, message?}`
  re-hydrated into RHF via `setError`. `nextCookies` sets the session cookie (request scope).
- **No shadcn `form`** in the base-nova registry → RHF used directly with `Input`/`Label`.
  Resolver = `@hookform/resolvers/standard-schema` (`standardSchemaResolver`) because zod 4
  implements Standard Schema and `zodResolver` types against zod 3 (typecheck error otherwise).
- **base-ui primitives:** `Button`/`Card` use a `render` prop, not `asChild`. Link-buttons
  built with the exported `buttonVariants()` on `<Link>`.
- **authClient** imported only by the client nav (`signOut`); server/display never imports it.
- Guard lives in the `(coach)` layout; mutating actions re-check session independently (convention 2).

## Verification (ran clean, over HTTP)

- unauth `GET /dashboard` → 307 → `/login`; `GET /` → 307 → `/dashboard`.
- `POST /api/auth/sign-in/email`: bad creds → 401; good creds (coach@lugiajen.nl /
  lugiajen2026) → 200 + `better-auth.session_token` cookie.
- authed `GET /dashboard` → 200 rendering "Actieve atleten", the "Sample Atleet" card, "Recente activiteit".
- `pnpm typecheck && pnpm lint && pnpm test` (17) clean.

## Follow-ups

- Nav links `/athletes` and `/competitions` 404 until Ch4/Ch8 (shell only).
- Ch4: athlete CRUD + profile shell; `messages/nl.ts` introduced there.
