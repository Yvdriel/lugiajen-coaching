# Ch4 — Athlete CRUD & profile shell

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch4).
> This file records what was built + decisions.

## Scope

Athlete list (filter/sort/search), create/edit forms, 6-tab profile shell (Overzicht +
Notities live; Kata/Scorekaarten/Feedback/Wedstrijden stubbed), share link, and the
**display-component contract** that Ch10's public portal reuses.

## Display contract (convention 3) — established here

`src/components/display/{athlete-header,athlete-card,stats-overview}.tsx` are pure
presentational: data via props + `mode:'coach'|'public'`. They import **only** `ui` +
types — no `getSession`, no server actions, no links/edit affordances, not even
`"use client"`. Parents inject interactivity: the profile passes `<ShareLinkButton>` +
edit `<Link>` into the header's `actions` slot; dashboard/list wrap `<AthleteCard>` in `<Link>`.
`stats-overview` hides physical notes when `mode==='public'`.

## Files

- **Schema:** +`athlete_notes` (append-only log) → migration `0001_red_dreadnoughts`.
- **Feature:** `src/features/athletes/{schema.ts (zod), actions.ts (create/update/addNote)}`.
- **Form:** `src/components/forms/athlete-form.tsx` (shared new/edit).
- **Queries:** `src/lib/queries/athletes.ts` (`getAthletesList`, `getAthleteById`,
  `getAthleteNotes`, `getDistinctBelts`).
- **Display:** `src/components/display/*`. **Clients:** `src/components/athletes/{athlete-filters,
  share-link-button,add-note-form}.tsx`.
- **Routes:** `(coach)/athletes/{page, new/page, [id]/page, [id]/edit/page}.tsx`.
- **Copy:** `src/messages/nl.ts`. **Edited:** dashboard (uses shared AthleteCard), seed (+sample note).
- **shadcn add:** tabs, table, textarea.

## Decisions / deviations

- **`athlete_notes` table** (not in Ch2) — the single `athletes.notes` text field can't model
  an append-only timestamped log. Additive migration.
- **Forms = native FormData + RHF, server-authoritative zod** (no client resolver): the zod 4
  coercion schema's input≠output types fight RHF's resolver typing, so validation is server-side
  (`actions.ts` parses FormData) and field errors re-hydrate into RHF via `setError`. Every action
  re-checks the session.
- **base-ui `Select`** doesn't post in FormData → native styled `<select>` in the form.
- **List filtering:** DB-level for active/belt/search; category + derived sorts (age,
  last-feedback, #competitions) computed in memory (club-scale). Filters → URL `searchParams`.
- **`messages/nl.ts` → `src/messages/nl.ts`** (for `@/` alias).
- Next 16 async `params`/`searchParams` — awaited.

## Verification (ran clean)

- `db:generate`/`db:migrate` → `0001`; `pnpm build` (all routes), `typecheck`, `lint`, `test` (17) clean.
- Mode-contract grep: display imports = ui + types only.
- Authed HTTP (port 3005): `/athletes` 200 (table, filters, Cadets badge, Nieuwe atleet);
  filtered query 200; `/athletes/{id}` 200 (Deel link, Overzicht, Fysiek profiel, Notities,
  seeded note); `/athletes/{id}/edit` 200; `/athletes/new` 200; bad id → **404**.
- Browser (manual): create → redirect to profile; edit persists; Deel link copies; add note appends.

## Follow-ups

- Stubbed tabs filled by Ch5 (Kata/Scorekaarten), Ch7 (Feedback), Ch8 (Wedstrijden).
- `stats-overview` real numbers in Ch9.
