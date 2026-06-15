# Ch2 — Data model, migrations & seed

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch2).
> This file records what was built + decisions.

## Scope

Full domain schema + Better Auth tables in one migration, age→category logic with
unit tests, and an idempotent seed (23 kata + demo coach + sample athlete).

## Schema (`src/db/schema.ts`)

7 app tables + 6 enums + relations, per CLAUDE.md exactly:
- **enums:** gender, kata_category, flex_category, form_type, competition_type, round_result
- **athletes** (uuid PK, `view_token` unique via `$defaultFn(crypto.randomUUID)`, is_active, timestamps)
- **kata** (name unique, split flags, flex A/B/C, sort_order)
- **athlete_kata** · **kata_scoring_cards** (12 criteria + overall; composite index
  `scoring_athlete_kata_date_idx` on (athlete_id, kata_id, assessment_date) — convention 5)
- **feedback_forms** (U12/U16 nullable fields) · **competitions** · **competition_entries**
  (per-round kata FKs + round_result enums)

Better Auth tables in `src/db/auth-schema.ts` (CLI-generated, **text PKs**), re-exported
from `schema.ts` (`export * from "./auth-schema"`) so drizzle.config's single schema path
emits one migration. **App uuid tables never FK to `user.id`** (convention 7).

## Decisions / deviations

- **Front-loaded `src/lib/auth.ts`** (minimal) — BA CLI generate + seed both need it.
  drizzleAdapter on the **serverless** client; `emailAndPassword`; create-before hook
  throws `APIError` unless `SEED=1`; `nextCookies()` last. Ch3 adds route handler + login UI.
  Imports: `better-auth/adapters/drizzle`, `better-auth/next-js`, `better-auth/api`.
- **BA schema regeneration:** `pnpm exec better-auth generate --config src/lib/auth.ts
  --output src/db/auth-schema.ts -y` (run with `.env` sourced). Diff on BA upgrade.
- **`categories.ts`:** pure `getCategoriesForAge(age)` (verbatim CLAUDE.md) + `calculateAge`
  + `getCategories` wrapper. Tests assert boundary ages 11–21 + age math.
- **Seed gating:** `"db:seed": "SEED=1 tsx src/db/seed.ts"`. Idempotent (kata
  `onConflictDoNothing`; coach + sample guarded by existence check). `signUpEmail` did
  not throw outside request scope; the try/catch fallback remains as a guard.
- **Read-back:** `src/db/verify.ts` (`pnpm db:verify`) asserts coach + 23 kata + sample athlete.

## Demo credentials (dev only)

`coach@lugiajen.nl` / `lugiajen2026` (created by seed; change for any non-local use).

## Verification (ran clean)

- `pnpm db:generate` → `drizzle/0000_opposite_silvermane.sql` (11 tables, 6 enums, index).
- `pnpm db:migrate` → 11 tables live. `pnpm db:seed` (×2, idempotent). `pnpm db:verify` OK.
- Row counts: kata 23, athletes 1, athlete_kata 2, scoring_cards 2, feedback 1,
  competitions 1, entries 1, user 1, account 1.
- `pnpm typecheck && pnpm lint && pnpm test` (18 tests) clean.

## Follow-ups

- Ch3: auth route handler (`api/auth/[...all]`), auth client, login page, `(coach)` guard,
  dashboard — builds on this `auth.ts`.
