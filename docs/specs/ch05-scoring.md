# Ch5 — Kata repertoire & scoring cards

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch5).
> This file records what was built + decisions.

## Scope

Fills the Ch4-stubbed **Kata** and **Scorekaarten** tabs: per-athlete kata repertoire
management, the WKF scoring-card form (append-only) with live deltas, and the bulk score
history table. Authors the canonical scoring queries (convention 4 + 5) that Ch6's charts reuse.

## Single source of truth — criteria

`src/features/scoring/criteria.ts` lists the 13 numeric criteria (`{ key, group:
technical|athletic|overall }`, ordered as rendered) + the 4 text fields, and a `formatDelta`
helper (↑ +1 / ↓ -2 / →). The form, the history table, the zod schema (keys) and the nl copy all
derive from it. A compile-time check asserts the keys exist on `kata_scoring_cards.$inferInsert`.

## Files

- **Queries:** `lib/queries/scoring.ts` (`getScoringHistory`, `getLatestScoringCard`,
  `getLatestCardsPerKata` — ROW_NUMBER window subquery), `lib/queries/kata.ts`
  (`getKataLibrary`, `getAthleteKata` joined, `getUnassignedKata`).
- **Features:** `features/scoring/{criteria,schema,actions}` (`saveScoringCard` — append-only),
  `features/kata/{schema,actions}` (`assignKata` / `updateAthleteKata` / `removeAthleteKata`).
- **Display (pure, mode prop, `actions` slot):** `display/kata-repertoire.tsx`,
  `display/score-history-table.tsx`.
- **Clients:** `forms/scoring-card-form.tsx`, `kata/assign-kata-form.tsx`,
  `kata/athlete-kata-edit-form.tsx`, `kata/remove-kata-button.tsx`.
- **Route:** `(coach)/athletes/[id]/kata/[kataId]/score/page.tsx`.
- **Edited:** `(coach)/athletes/[id]/page.tsx` (Kata + Scorekaarten tabs, `?tab`/`?scoreKata`/
  `?editKata`), `messages/nl.ts` (+`kata`/`scoring`), `lib/queries/athletes.ts` (uuid guard).

## Decisions / deviations

- **Append-only (convention 5):** `saveScoringCard` only `db.insert`s a new snapshot; "previous"
  for deltas = the current latest row. Verified: DB count 2→3 on save, never an UPDATE.
- **Text fields = all four** (`kataSpecificNotes`, `priorityImprovements`, `strengths`,
  `coachNotes`) — superset of BUILD-PLAN's "3 note fields", matching the table / `CLAUDE.md` model.
- **Forms = native FormData + server-authoritative zod** (Ch4 pattern). Scoring form is a client
  component; live deltas via RHF **`useWatch`** (not `watch()` — the latter trips React Compiler).
  Numeric inputs **prefill the previous value** (delta starts at →); text fields stay blank.
- **Tabs stay uncontrolled.** Deep-linking via `?tab` (initial `defaultValue`), `?scoreKata`
  (which kata's history), `?editKata` (which repertoire row to edit) — all read server-side; the
  chip / edit / "Beoordelen" links do full navigations, so the page re-renders with the right state.
- **athlete_kata edit** is a full-width form gated by `?editKata=<id>` (rendered above the
  repertoire table) rather than cramped inline-cell editing; `updateAthleteKata` redirects back to
  `?tab=kata`. The pure `KataRepertoire` stays read-only; coach affordances are parent-injected.
- **uuid guard:** `getAthleteById` returns null for non-uuid ids → garbage `/athletes/<x>` paths
  404 instead of 500 on the Postgres uuid cast (surfaced during Ch5 verification).

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (17) / `build` all clean (route
  `/athletes/[id]/kata/[kataId]/score` in the manifest).
- Authed HTTP (port 3005): Kata tab 200 (repertoire + flex/niveau + assign form); score form 200
  (`vorige:` ×13, full previousCard in payload); Scorekaarten 200 (3 cols newest-first after a
  test insert, Kime `9 ↑+2 / 7 ↑+2 / 5`); edit form 200; non-repertoire kata → 404; nonexistent
  uuid → 404; malformed id → 404 (post-guard).
- DB read-back: append-only count 2→3→2 (test row cleaned up); window latest-per-kata drives the
  Kata-tab "laatste beoordeling" date.
- Mode-contract grep: display imports = ui + nl + type-only query/criteria.

## Follow-ups

- Ch6: radar / trend / sparkline + **color-coded** history table (this table is plain text) +
  surface latest priority-improvements in the viz.
- Ch8 competition entries select kata from this repertoire; Ch9 stats read proficiency + cards.
