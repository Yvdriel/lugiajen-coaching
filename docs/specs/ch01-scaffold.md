# Ch1 — Scaffold, tooling & data-layer wiring

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch1).
> This file records what was actually built + the decisions taken.

## Scope

Greenfield foundation: Next.js 16 (App Router, TS, Turbopack) + Tailwind v4 +
shadcn/ui; the Drizzle + Neon **dual-driver** data layer; zod env validation;
Vitest; local Docker DB; chapter-spec stubs.

## Versions (grounded via context7, 2026-06-15)

- next 16.2.9 · react 19.2.4 · tailwindcss 4.3.1 · @tailwindcss/postcss
- shadcn 4.x, preset **base-nova** (uses @base-ui/react), baseColor **neutral**, cssVariables
- drizzle-orm 0.45.2 · @neondatabase/serverless 1.1.0 · ws 8.21 · zod 4.4.3
- drizzle-kit 0.31.10 · vitest 4.1.9 · tsx 4.22 · dotenv 17.4

## Key decisions

- **Local DB = Docker Postgres + local Neon proxy.** Convention 1 mandates the
  neon-http / neon-serverless drivers (Neon HTTP/WS wire protocol, not raw
  Postgres TCP). To run that exact code locally, `docker-compose.yml` fronts
  `postgres:17` with `ghcr.io/timowilhelm/local-neon-http-proxy` (`/sql` HTTP +
  `/v2` WS on :4444). Runtime db code is byte-identical local↔Neon prod; only
  `neonConfig` overrides differ, gated on `NEON_LOCAL=true` (`src/lib/db.ts`,
  `src/lib/db.serverless.ts`). drizzle-kit talks straight to Postgres:5432 via
  `DATABASE_URL_UNPOOLED`.
- **File layout:** db clients in `src/lib/` (per BUILD-PLAN conv. 1); schema/seed
  in `src/db/`; migrations out-dir `./drizzle`.
- **Brand:** monochrome `--brand-*` tokens (CLAUDE.md) added to `@theme` in
  `src/app/globals.css`; shadcn neutral OKLCH palette kept; font swapped Geist→Inter.
- **Git:** committed to `main`.

## Files created

`docker-compose.yml` · `src/lib/{db,db.serverless,env}.ts` · `drizzle.config.ts` ·
`src/db/{schema,seed}.ts` · `vitest.config.mts` · `src/app/page.test.tsx` ·
`.env` (gitignored) · `.env.example` · `docs/specs/ch01..ch12-*.md`. Edited
`src/app/{globals.css,layout.tsx,page.tsx}`, `package.json`, `.gitignore`.

## Verification

- `pnpm db:up` → postgres healthy + proxy on :4444.
- `pnpm db:migrate` connects (empty schema).
- `SELECT 1` smoke via both `src/lib/db.ts` (neon-http) and `src/lib/db.serverless.ts` (Pool).
- `pnpm dev` boots; `pnpm typecheck && pnpm lint && pnpm test` clean.

## Follow-ups for later chapters

- Ch2 fills `src/db/schema.ts` + real `src/db/seed.ts`; commits Better Auth tables
  into the schema dir (single drizzle-kit migration).
- Prod (Neon cloud): set `NEON_LOCAL` unset/false + real Neon pooled/unpooled URLs.
