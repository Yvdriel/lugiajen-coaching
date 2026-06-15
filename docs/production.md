# Production & hardening notes

Operational notes for deploying Lu Gia Jen. Written in Ch12; the app itself is
feature-complete (Ch1–Ch12).

## Deploy (Vercel)

- Framework preset: Next.js (App Router, Turbopack). Build = `next build`, no special config.
- `@react-pdf/renderer` runs on the **nodejs** runtime via `serverExternalPackages` (already set in
  `next.config.ts`) — the PDF route handlers (`app/api/**/pdf/route.ts`) are `runtime = "nodejs"`.
- `src/proxy.ts` (Next 16's renamed middleware) runs on the nodejs runtime and guards the public
  portal (`/athlete/view/:path*`) with rate-limiting + `noindex` / `no-referrer` headers.

### Required env vars

- `DATABASE_URL` — pooled Neon connection (the 95% single-statement path, `src/lib/db.ts`).
- `DATABASE_URL_UNPOOLED` — direct connection for drizzle-kit `migrate`/`push` (DDL only).
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` — Better Auth.
- Run `pnpm db:migrate` against the production DB before first boot; seed the coach account
  (`pnpm db:seed`) or create it via the invite/seed flow. There is **no public registration**.

## Database backups (Neon)

- Enable Neon **point-in-time restore** (history retention) on the production branch.
- For releases, branch the DB (Neon branching) and run migrations on the branch first, then promote —
  this gives an instant rollback point.
- Take a logical dump (`pg_dump`) before any destructive migration.

## Rate limiting

- The portal limiter (`src/lib/rate-limit.ts`) is **in-memory** (per server instance) behind a
  `RateLimiter` interface — basic abuse protection, not distributed.
- **Production swap:** implement `RateLimiter` with Upstash (`@upstash/ratelimit` + `@upstash/redis`)
  and replace `portalRateLimiter`; no caller changes. Add `UPSTASH_REDIS_REST_URL` / `…_TOKEN`.
- **Follow-up:** the public PDF endpoint (`/api/athlete/view/[token]/pdf`) is heavier than a page hit
  and is **not** currently behind the portal `proxy` matcher (`/athlete/view/:path*` ≠ `/api/...`, and
  the limiter's token extraction assumes the portal path shape). Add a dedicated limiter for it before
  exposing the portal widely.

## Security headers

- Baseline headers are set globally in `next.config.ts` `headers()`: `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security` (HSTS — inert over plain HTTP in local dev).
- **CSP follow-up:** a strict `Content-Security-Policy` is intentionally not set yet — it needs nonce
  wiring for Next's inline styles/scripts. Add via `proxy.ts` (per-request nonce) when hardening
  further.

## Offline / competition day

- Approach: **local-state buffering** (no service worker). The competition wizard mirrors its state to
  `localStorage` (`components/competition/wizard-draft.ts`) and rehydrates on reload; each save is
  wrapped in `try/catch` so a network blip shows a retryable error without losing entered data.
- A full PWA (manifest + service worker for offline app-shell) was considered and deferred — the
  buffering approach satisfies "competition entry survives a network blip" with far less surface.

## Known deferrals

- **Pagination.** Athlete / competition / per-athlete feedback + competition lists load all rows.
  Fine at club scale (dozens of athletes, a few events/season); add `limit`/`offset` to the
  `lib/queries/*` helpers if a list grows large.
- **CSP** (above). **Distributed rate-limit** + **public-PDF limiter** (above).
- **Vercel project / first deploy** is a manual step (kept out of the codebase).
