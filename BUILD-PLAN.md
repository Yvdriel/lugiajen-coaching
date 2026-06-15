# Lu Gia Jen — Build Plan & Progress Checklist

> **This file is the shared, living checklist for building the platform.** Each chapter = one Claude Code session. Sessions read this file, tick boxes as work completes, and log what they did. `CLAUDE.md` is the product spec (fields/copy/UI — source of truth); **this file is the execution map**.

---

## How to use this file (every new session, read first)

1. **Pick the lowest-numbered chapter that is not `done`** whose dependencies are all `done`. Do not skip ahead — chapters are dependency-ordered.
2. Read: this chapter's section below + the matching `CLAUDE.md` sections + the **Cross-cutting conventions** below.
3. **Pull current library API via context7** (`resolve-library-id` → `query-docs`) for that chapter's libs *before* coding. Versions in this file are a starting point, not gospel.
4. Set the chapter **Status** to `🟡 in progress` and tick `- [ ]` → `- [x]` as each task lands. Use TDD where it fits (schema/query/category/stats logic).
5. Fan out a workflow along the chapter's **Fan-out** axis only when the work is genuinely independent.
6. Before claiming done: satisfy **every** box in **Done when**. Run the app / tests / DB read-back — don't assert without evidence.
7. Set Status to `✅ done`, fill the **Session log** line (date, branch/PR, anything that diverged from plan), and update the **Progress overview** table.
8. Commit on a feature branch (`ch01-scaffold`, `ch02-schema`, …); open a PR or merge per preference.

**Status legend:** `⬜ not started` · `🟡 in progress` · `✅ done` · `⛔ blocked`
**Task boxes:** `- [ ]` open · `- [x]` complete.

---

## Progress overview

| Ch | Title | Status | Depends on |
|----|-------|--------|------------|
| 1  | Scaffold, tooling & data-layer wiring | ✅ | Prereqs |
| 2  | Data model, migrations & seed | ✅ | Ch1 |
| 3  | Auth & app shell | ✅ | Ch2 |
| 4  | Athlete CRUD & profile shell | ✅ | Ch3 |
| 5  | Kata repertoire & scoring cards | ✅ | Ch4 |
| 6  | Scoring-card visualizations | ✅ | Ch5 |
| 7  | Feedback forms (U12 / U16) | ⬜ | Ch4 |
| 8  | Competitions | ⬜ | Ch5 |
| 9  | Athlete stats overview | ⬜ | Ch5–8 |
| 10 | Public athlete viewer portal | ⬜ | Ch4 + 5/6/7/8/9 |
| 11 | PDF export | ⬜ | Ch6/7/9 |
| 12 | Polish (mobile / offline / hardening) | ⬜ | all |

---

## Prerequisites (user actions — do before Ch1/Ch2)

> **Local dev (Ch1):** done via Docker, not Neon cloud. `pnpm db:up` runs Postgres +
> a local Neon HTTP/WS proxy; `.env` points at it (`NEON_LOCAL=true`). The Neon-cloud
> boxes below remain for **production deploy** (Vercel).

- [ ] Create a **Neon** project. _(prod only; local uses docker-compose)_
- [x] Put the **pooled** connection string in `.env` as `DATABASE_URL`. _(local docker)_
- [x] Put the **direct / unpooled** connection string in `.env` as `DATABASE_URL_UNPOOLED`. _(local docker)_
- [x] Generate a Better Auth secret → `.env` as `BETTER_AUTH_SECRET` (+ `BETTER_AUTH_URL`).
- [ ] (Later, Ch10) Decide rate-limit backend (Vercel middleware / Upstash).
- [ ] (Later) Create Vercel project for deploy.

---

## Tech stack (grounded, June 2026 — confirm via context7 each session)

- **Next.js 16.2.x** App Router, React 19, TypeScript, Turbopack. Node 20+.
- **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config`) + **shadcn/ui** (latest CLI, CSS-variables mode).
- **Drizzle ORM** + **Neon** — dual driver (see conventions).
- **Better Auth** (email/password) + Drizzle adapter.
- **Recharts** (via shadcn `chart`) for radar / line / sparkline.
- **react-hook-form + zod + shadcn Form**; mutations via **Server Actions** returning typed result objects.
- **@react-pdf/renderer** for PDFs (Route Handler, Node runtime).
- **Vitest** unit tests. **pnpm**.

---

## Cross-cutting conventions (apply in EVERY chapter — do not violate)

1. **Dual Neon driver** (set up Ch1, never refactored):
   - `src/lib/db.ts` → `drizzle-orm/neon-http` (`neon()`), pooled `DATABASE_URL`. The 95% single-statement path. Atomic multi-row writes use Drizzle `db.batch([...])` — **not** interactive transactions.
   - `src/lib/db.serverless.ts` → `drizzle-orm/neon-serverless` (`Pool`, `ws`). The only client doing real `db.transaction(...)`. Used by seed scripts **and bound to the Better Auth adapter** (its `signUpEmail` runs in a transaction).
   - `drizzle.config.ts` → `dialect: 'postgresql'`, **unpooled** `DATABASE_URL_UNPOOLED` for `migrate`/`push` DDL.
2. **Server actions never throw for validation.** Return `{ ok, fieldErrors?, message? }`; drive UI with React 19 `useActionState`; re-hydrate `fieldErrors` into RHF via `setError`; RHF `mode: 'onBlur'`. Reserve `throw` (→ `error.tsx`) for genuine failures. **Every mutating action re-checks the session itself** — don't trust the layout guard alone.
3. **Display-component contract** (key to cheap Ch10 reuse): anything rendering athlete data lives in `src/components/display/*` as **pure presentational** — data via props + `mode: 'coach' | 'public'`; **never** calls `getSession`, **never** imports server actions, **never** renders its own edit/link affordances. Parents inject interactivity. Enforced + reviewed at Ch4.
4. **Shared query helpers** in `src/lib/queries/*`, authored by the chapter that first needs them, so Ch9 *assembles* rather than re-queries. One canonical "latest scoring card" definition shared by form, deltas, charts.
5. **Append-only scoring history:** save = always INSERT a new row. Latest/previous/trend via `ROW_NUMBER() OVER (PARTITION BY athlete_id, kata_id ORDER BY assessment_date DESC, created_at DESC)`. Index `(athlete_id, kata_id, assessment_date)`.
6. **Dutch copy** for athlete-facing strings via `messages/nl.ts` (from Ch4). Coach UI prefers Dutch too.
7. **Better Auth schema owned by drizzle-kit:** generate once with `@better-auth/cli generate`, commit into the schema dir, migrate via the single drizzle-kit pipeline. Never run Better Auth's own migrate. BA PKs are `text` (not uuid) — don't FK app uuid tables to `user.id`. Re-generate + diff on BA upgrade.
8. **Validation in zod** colocated per feature (`<feature>/schema.ts`), reused by client form + server action.
9. **Server components by default**; client components only for interactive forms/charts. Per-tab `revalidatePath` after mutations.

---

## Target repo & route structure (per `CLAUDE.md`)

```
src/app/(auth)/login   (coach)/dashboard   (coach)/athletes/[id]/{kata/[kataId]/score, feedback/new, feedback/[id], competitions}
       (coach)/competitions/{[id], new}    athlete/view/[token]   api/auth/[...all]   api/**/pdf
src/components/{ui, display, forms, charts, athlete, competition, layout}
src/db/{schema.ts, seed.ts}   src/lib/{db.ts, db.serverless.ts, auth.ts, utils.ts, categories.ts, queries/*}
messages/nl.ts   drizzle.config.ts   docs/specs/chNN-*.md
```

---

# Chapters

## Ch1 — Scaffold, tooling & data-layer wiring
**Status:** ✅ done · **Depends on:** Prereqs · **Fan-out:** Low (init serial; shadcn after Tailwind)
**Libs to context7:** Next.js, shadcn/Tailwind v4, Drizzle, `@neondatabase/serverless`, Vitest

**Tasks**
- [x] Scaffold Next.js 16 (TS, App Router, `src/`, Turbopack, pnpm). _(next 16.2.9 / react 19.2.4)_
- [x] Tailwind v4 + `shadcn` init in **CSS-variables** mode; blank `tailwind.config` (v4 CSS-first). _(shadcn 4.x, preset base-nova, neutral)_
- [x] Brand tokens (monochrome palette from `CLAUDE.md`) in `@theme`; Inter font; base global CSS.
- [x] `src/lib/db.ts` (neon-http, pooled URL) + `src/lib/db.serverless.ts` (Pool + `ws`).
- [x] `drizzle.config.ts` (postgresql, unpooled URL) + empty `src/db/schema.ts`.
- [x] Env validation module (zod) for `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- [x] Vitest wired (config + sample test runs).
- [x] `package.json` scripts: `dev build lint typecheck format test db:generate db:migrate db:seed` _(+ `db:up`/`db:down`)_.
- [x] `.gitignore`, `.env.example`; `git init` + first commit. _(repo already on GitHub `Yvdriel/lugiajen-coaching`)_
- [x] Write `docs/specs/ch01..ch12-*.md` stubs (one per chapter, seeded from this file's sections).

**Done when**
- [x] `pnpm dev` boots a page. _(GET / 200, brand page renders)_
- [x] `src/lib/db.ts` connects to Neon (a trivial `SELECT 1` succeeds). _(both drivers, via local proxy)_
- [x] `pnpm typecheck && pnpm lint && pnpm test` all pass clean.

**Session log:** 2026-06-15 · `main` · Local dev = Docker Postgres + local Neon proxy
(`ghcr.io/timowilhelm/local-neon-http-proxy`) so neon-http/neon-serverless run
unchanged local↔prod (gated on `NEON_LOCAL`). `db:migrate` is a programmatic
migrator (`src/db/migrate.ts`) — drizzle-kit's driver auto-select didn't honor the
local proxy. shadcn preset **base-nova** (uses `@base-ui/react`, not Radix); font Inter.
See `docs/specs/ch01-scaffold.md`.

---

## Ch2 — Data model, migrations & seed
**Status:** ✅ done · **Depends on:** Ch1 · **Fan-out:** High (schema by domain group; parallel-verify each kata row; categories+tests independent)
**Libs to context7:** Drizzle (pg enums/indexes/relations), Better Auth CLI, drizzle-kit

**Tasks**
- [x] Schema: `athletes` (+ gender enum, `view_token` unique, `is_active`, timestamps).
- [x] Schema: `kata` (+ category enum, split booleans, flex A/B/C enum, sort_order).
- [x] Schema: `athlete_kata` (FKs, round_order, is_competition_kata, proficiency, notes).
- [x] Schema: `kata_scoring_cards` (12 criteria + overall + note fields) **+ index `(athlete_id, kata_id, assessment_date)`**.
- [x] Schema: `feedback_forms` (form_type enum, all U12/U16 nullable fields, goals, action_1..3).
- [x] Schema: `competitions` + `competition_entries` (per-round kata FKs + win/loss enums, results, feedback).
- [x] Generate Better Auth tables (`user/session/account/verification`) via CLI; **commit into the schema dir** (single migration). _(src/db/auth-schema.ts, re-exported)_
- [x] `src/lib/categories.ts`: `calculateAge`, `getCategories` (own category + one above) + **Vitest unit tests** (boundary ages 11/12/13/14/15/16/17/18/20/21).
- [x] `src/db/seed.ts`: all 23 Shotokan kata (exact names / split flags / flex / sort_order per `CLAUDE.md`).
- [x] Seed demo coach via `auth.api.signUpEmail` under the **serverless** client (gate signup hook with `SEED=1`).
- [x] Seed one sample athlete + sample athlete_kata / scoring cards / feedback / competition for dev.

**Done when**
- [x] `pnpm db:migrate` applies cleanly (one migration `0000_opposite_silvermane` incl. BA tables; 11 tables live).
- [x] `pnpm db:seed` populates without error (idempotent; re-runnable).
- [x] A query test reads back seeded coach + all 23 kata + sample athlete (`pnpm db:verify`).
- [x] `pnpm test` green (18 tests; category boundary logic verified).

**Session log:** 2026-06-15 · `main` · Front-loaded minimal `src/lib/auth.ts` (Ch3 extends it)
since BA CLI generate + seed both need it. BA schema generated via `pnpm exec better-auth
generate` → `src/db/auth-schema.ts` (text PKs), re-exported from `schema.ts` so one drizzle
migration covers app + BA tables. `db:seed` gated by `SEED=1`; demo coach `coach@lugiajen.nl`
/ `lugiajen2026`. DB read-back via `pnpm db:verify`. See `docs/specs/ch02-schema.md`.

---

## Ch3 — Auth & app shell
**Status:** ✅ done · **Depends on:** Ch2 · **Fan-out:** Low/medium (auth wiring serial; login/layout/dashboard parallel after `getSession`)
**Libs to context7:** Better Auth (Next handler, getSession, databaseHooks, nextCookies)

**Tasks**
- [x] `src/lib/auth.ts`: drizzleAdapter on **serverless** client, `emailAndPassword`, `databaseHooks.user.create.before` blocking signup unless `SEED=1`, `nextCookies()` as **last** plugin. _(done Ch2)_
- [x] `src/app/api/auth/[...all]/route.ts` → `toNextJsHandler`.
- [x] Auth client + `(auth)/login` page (Dutch copy) with RHF + typed action.
- [x] `(coach)/layout.tsx` guard: `getSession` → `redirect('/login')`.
- [x] `components/layout/*` sidebar + nav.
- [x] `(coach)/dashboard` page: real quick-stats (active athletes, upcoming competitions), athlete cards, recent activity (last 5–10).

**Done when**
- [x] Valid coach logs in; bad creds rejected. _(HTTP: good creds 200+session cookie, bad creds 401)_
- [x] Unauthenticated hit on any `(coach)` route redirects to `/login`. _(307; `/` → `/dashboard`)_
- [x] Dashboard renders seeded counts/cards. _(authed 200: Actieve atleten, Sample Atleet card, Recente activiteit)_

**Session log:** 2026-06-15 · `main` · Login = server action (`auth.api.signInEmail`) +
RHF (`useActionState`, `mode:'onBlur'`); base-nova registry has **no shadcn `form`** →
RHF direct with Input/Label, resolver = `@hookform/resolvers/standard-schema` (zod 4 is a
Standard Schema; `zodResolver` types against zod 3). `Button`/`Card` are base-ui (use
`render`/no `asChild`) → link-buttons via exported `buttonVariants()`. Root `/` → redirect
`/dashboard`; removed Ch1 `page.test.tsx`. See `docs/specs/ch03-auth.md`.

---

## Ch4 — Athlete CRUD & profile shell
**Status:** ✅ done · **Depends on:** Ch3 · **Fan-out:** Medium (list+filter // create+edit // profile shell // shared display components)
**Libs to context7:** Next.js server actions + useActionState, shadcn Table/Form/Tabs

**Tasks**
- [x] `/athletes` list: filter (category / active / belt), sort (name / age / last-feedback / #competitions), search. _(URL searchParams; DB-level for active/belt/search, derived in memory)_
- [x] Athlete create + edit forms (RHF + zod `features/athletes/schema.ts` + server actions, typed results).
- [x] `/athletes/[id]` 6-tab shell — tabs: Overzicht, Kata, Scorekaarten, Feedback, Wedstrijden, Notities (**Overzicht + Notities live; rest stubbed**).
- [x] Computed age + eligible category badges (reuse `lib/categories.ts`).
- [x] "Deel link" button copies `/athlete/view/{view_token}`.
- [x] `components/display/athlete-header`, `athlete-card`, `stats-overview` (shell) — honoring the **mode-prop contract** (convention 3).
- [x] Notities: append-only timestamped log. _(new `athlete_notes` table, migration `0001`)_
- [x] `messages/nl.ts` introduced (`src/messages/nl.ts`); athlete-facing strings routed through it.

**Done when**
- [x] Create → edit → list → profile round-trips. _(read paths verified authed over HTTP; create/edit via browser actions)_
- [x] Age + categories correct (incl. "one above"). _(reuses unit-tested `categories.ts`)_
- [x] Share link copies to clipboard. _(ShareLinkButton; browser clipboard)_
- [x] **Mode contract reviewed**: display components call no `getSession`, import no server actions. _(grep: import only ui + types; not even client components)_

**Session log:** 2026-06-15 · `main` · New `athlete_notes` table (additive migration `0001`)
for the append-only Notities log. Feature layout: `features/athletes/{schema,actions}` +
`components/forms/athlete-form` + `lib/queries/athletes` + pure `components/display/*`.
Forms = native FormData + RHF (server-authoritative zod; no client resolver to avoid zod4
input/output mismatch). base-ui `Select` doesn't post FormData → native `<select>`. Dashboard
card refactored to shared `display/athlete-card`. `messages/nl.ts` → `src/messages/nl.ts`
(for `@/` alias). Dev now on **:3005** (BETTER_AUTH_URL). See `docs/specs/ch04-athletes.md`.

---

## Ch5 — Kata repertoire & scoring cards (form + append-only history)
**Status:** ✅ done · **Depends on:** Ch4 · **Fan-out:** Medium (athlete_kata mgmt // scoring form // queries+actions)
**Libs to context7:** Drizzle window functions, Next.js server actions

**Tasks**
- [x] `athlete_kata` management UI (assign kata, round_order, is_competition_kata, proficiency 1–10, per-kata notes) → **Kata tab**. _(assign form + per-row edit via `?editKata=` + remove)_
- [x] `src/lib/queries/scoring.ts`: canonical latest / previous / trend window queries (convention 5). _(`getScoringHistory` / `getLatestScoringCard` / `getLatestCardsPerKata` ROW_NUMBER)_
- [x] Scoring-card form `/athletes/[id]/kata/[kataId]/score`: 12 WKF criteria + overall + note fields; **previous score shown grayed beside each input with ↑↓→ delta**. _(all 4 text fields; numerics prefill previous, live `useWatch` delta)_
- [x] Save = **append-only INSERT** (never UPDATE).
- [x] **Scorekaarten tab**: bulk history table (data only; rich viz is Ch6). _(criteria × dates, deltas vs next-older; kata chips via `?scoreKata=`)_

**Done when**
- [x] Assign kata to an athlete. _(assign form renders unassigned options; action inserts athlete_kata)_
- [x] Save 2+ assessments for one athlete+kata; second save shows correct deltas. _(DB read-back: count 2→3→2; Kime `9 ↑+2 / 7 ↑+2 / 5`)_
- [x] History lists all rows newest-first; DB shows multiple rows (no UPDATEs). _(saveScoringCard only INSERTs; history ordered assessment_date+created_at DESC)_

**Session log:** 2026-06-15 · `main` · Criteria single-sourced in `features/scoring/criteria.ts`
(13 numeric {key,group} + 4 text), compile-checked against the table insert type; form/table/
schema/nl all derive from it. Scoring form = client RHF + `useWatch` for live deltas, numerics
prefill the previous card (grayed `vorige: N`); save action append-only INSERTs then redirects to
`?tab=scoring&scoreKata=…`. Pure `display/{kata-repertoire,score-history-table}` (mode prop,
`actions` render-slot) reused by Ch10. Tabs stay uncontrolled — deep-linked via `?tab`/`?scoreKata`/
`?editKata` read server-side (chip/edit links do full navigations). Window latest-per-kata via
ROW_NUMBER subquery. Hardened `getAthleteById` to 404 (not 500) on non-uuid path segments. See
`docs/specs/ch05-scoring.md`.

---

## Ch6 — Scoring-card visualizations
**Status:** ✅ done · **Depends on:** Ch5 · **Fan-out:** **Highest** (radar // trend // sparkline // history-table, all over `lib/queries/scoring.ts`)
**Libs to context7:** Recharts (RadarChart, LineChart), shadcn chart

**Tasks**
- [x] Radar/spider chart of current 12 criteria. _(`charts/score-radar-chart`, latest card, technical+athletic)_
- [x] Per-criterion trend line chart over assessment dates. _(overall-impression `charts/score-trend-chart` + per-criterion sparkline grid)_
- [x] Axis-less sparklines for Kata-tab summaries. _(`charts/trend-sparkline`, Verloop column; reused in the per-criterion grid)_
- [x] Color-coded **score-history-table** (green=improved, red=declined, neutral=unchanged; `+1/-2` deltas).
- [x] Surface latest card's priority-improvements. _(done Ch5; retained beside the charts)_

**Done when**
- [x] All four render real history. _(authed HTTP: 2 chart surfaces + 15 wrappers from seeded Heian cards; titles present)_
- [x] Delta colors correct; charts responsive. _(24 emerald cells / 0 red for all-improving seed deltas; ChartContainer = ResponsiveContainer)_
- [x] Sparklines embedded in Kata tab. _(Heian row sparkline renders; Bassai with 0 cards shows "—")_

**Session log:** 2026-06-15 · `main` · Recharts **3.8.0** via `shadcn add chart` (base-nova →
`ui/chart.tsx`); bundles clean under Turbopack (no `transpilePackages` needed). Charts are pure
client display components in `components/charts/` (props only, no session/actions) → Ch10 reuses
them. Monochrome via the brand's grayscale `--chart-1..5`; the **only** color is the
CLAUDE-mandated green/red on the history-table delta cells. One new query
`getScoringSeriesByKata` feeds the Kata-tab sparklines; the Scorekaarten charts derive from the
existing `history`. Recharts draws most inner SVG client-side post-hydration (SSR mounts the
wrappers) — verified via wrapper/title/colour markup + a clean `pnpm build`. See
`docs/specs/ch06-viz.md`.

---

## Ch7 — Feedback forms (U12 / U16)
**Status:** ⬜ · **Depends on:** Ch4 (independent of Ch5/6) · **Fan-out:** Medium (U12 // U16 // auto-detect // Feedback tab)
**Libs to context7:** Next.js server actions, shadcn Form

**Tasks**
- [ ] `forms/feedback-form-u12.tsx` (exact U12 fields per `CLAUDE.md`).
- [ ] `forms/feedback-form-u16.tsx` (exact U16 fields per `CLAUDE.md`).
- [ ] Auto-detect U12/U16 by athlete age **with manual override**.
- [ ] `/athletes/[id]/feedback/new` + `/feedback/[feedbackId]` view/edit; Side A (self) / Side B (coach) sections, live-fillable.
- [ ] **Feedback tab**: chronological list (date, meeting #, season, type) + expand.

**Done when**
- [ ] Both variants save and re-display all fields.
- [ ] Correct template auto-picked per age; override works.
- [ ] Tab list + expand works.

**Session log:**

---

## Ch8 — Competitions
**Status:** ⬜ · **Depends on:** Ch5 · **Fan-out:** Medium (CRUD // entries+feedback // wizard // Wedstrijden tab)
**Libs to context7:** Next.js, Drizzle `batch()`

**Tasks**
- [ ] `/competitions` list + `/competitions/new` (name, date, location, type) + `/competitions/[id]` detail.
- [ ] `competition_entries`: category, kata per round (from athlete repertoire), win/loss per round, placement, round reached.
- [ ] Competition **wizard/stepper**: select/create → add athletes → per-athlete category+katas → results → feedback.
- [ ] Per-entry feedback fields (before / performance / improvement / lesson).
- [ ] Atomic entry save via `db.batch()`.
- [ ] **Wedstrijden tab** on athlete with summary stats.

**Done when**
- [ ] Create competition, add athletes, record per-round results + placement.
- [ ] Fill feedback; visible on both competition detail and athlete tab.

**Session log:**

---

## Ch9 — Athlete stats overview
**Status:** ⬜ · **Depends on:** Ch5–8 · **Fan-out:** High (one independent reader per stat panel)
**Libs to context7:** Drizzle aggregations

**Tasks**
- [ ] `src/lib/queries/athlete-stats.ts`: total competitions; podium counts (1/2/3); win/loss per round; competitions by type; most-performed competition kata; active repertoire + proficiency; active goals (latest feedback); physical profile; current focus points (latest feedback + scoring cards).
- [ ] Fill the `stats-overview` display component (built Ch4).
- [ ] Vitest for the aggregation helpers.

**Done when**
- [ ] Overzicht shows correct numbers vs seeded + created data.
- [ ] Cross-checked against raw queries.

**Session log:**

---

## Ch10 — Public athlete viewer portal
**Status:** ⬜ · **Depends on:** Ch4 contract + display components from 5/6/7/8/9 · **Fan-out:** Low (rate-limit infra // page assembly)
**Libs to context7:** Next.js ISR/headers/middleware, rate-limit lib (Upstash if chosen)

**Tasks**
- [ ] `/athlete/view/[token]` resolves `view_token` → renders the SAME `components/display/*` in `mode: 'public'` (overview, scoring history + charts, feedback, competitions).
- [ ] Branded header "Atleetprofiel — [Name]".
- [ ] ISR (short revalidate).
- [ ] Rate-limit by IP+token; `X-Robots-Tag: noindex`; `referrer-policy: no-referrer`.
- [ ] Support `view_token` rotation; never send token to analytics.

**Done when**
- [ ] Valid token renders read-only profile (zero edit affordances; no `getSession` in display path).
- [ ] Invalid token 404s.
- [ ] Rate-limit trips on abuse; `noindex` present.

**Session log:**

---

## Ch11 — PDF export
**Status:** ⬜ · **Depends on:** Ch6/7/9 · **Fan-out:** Medium (Node-runtime seam first, then 3 templates parallel)
**Libs to context7:** @react-pdf/renderer (App Router route handler, serverExternalPackages)

**Tasks**
- [ ] PDF module isolated (never imported by client); set `serverExternalPackages` + `runtime = 'nodejs'`.
- [ ] Branded A4 feedback-form PDF (matches Lu Gia Jen form design).
- [ ] Scoring-card summary PDF.
- [ ] Athlete one-pager PDF.
- [ ] `app/api/**/pdf/route.ts` handlers using `renderToStream`/`renderToBuffer`.
- [ ] Coach PDF routes check session; any public one-pager validates `view_token`.
- [ ] Print buttons wired into the relevant tabs.

**Done when**
- [ ] Each route returns a valid PDF matching brand.
- [ ] No `ba.Component is not a constructor` / reconciler bundling error.
- [ ] Auth / token checks enforced.

**Session log:**

---

## Ch12 — Polish (mobile / offline / hardening)
**Status:** ⬜ · **Depends on:** all · **Fan-out:** High (mobile // loading+error // offline // hardening // docs)

**Tasks**
- [ ] Mobile optimization — scoring + competition entry forms first.
- [ ] Loading + error states on all async ops.
- [ ] Offline-tolerance for competition day (service worker / local-state buffering).
- [ ] Rate-limit hardening; prod + backup notes in `docs/`.
- [ ] Accessibility pass + empty states.

**Done when**
- [ ] Scoring + competition flows usable one-handed on phone.
- [ ] Graceful loading/error everywhere.
- [ ] Competition entry survives a network blip.

**Session log:**

---

## Global verification

- **Per chapter:** the chapter's **Done when** gate (typecheck + lint + Vitest + manual flow + DB read-back).
- **Data integrity:** Vitest for `categories.ts`, scoring window queries, stats aggregations.
- **End-to-end smoke (after Ch9):** seed → log in → create athlete → assign kata → 2 scoring cards (verify deltas) → feedback form → competition + results → check Overzicht numbers → open public viewer link.
- **Pre-deploy (after Ch11/12):** PDF routes return valid files; public viewer `noindex` + rate-limit; mobile pass on scoring + competition forms.
