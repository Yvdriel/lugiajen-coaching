# Ch8 — Competitions

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch8).
> This file records what was built + decisions.

## Scope

Competition management over the existing `competitions` + `competition_entries` tables (no schema
change): competition CRUD, per-athlete entries (category, kata-per-round from the athlete's
repertoire, win/loss per round, placement, round reached), per-entry feedback (before / performance /
improvement / lesson + coach notes), a guided entry **wizard**, and the athlete **Wedstrijden** tab
with summary stats. Depends on Ch5 (repertoire). The sidebar + dashboard already linked to
`/competitions*` (previously dead).

## Files

- **Feature:** `features/competitions/{schema.ts, actions.ts, summary.ts (+test), entry.ts, values.ts}`.
- **Query:** `lib/queries/competitions.ts` (list+entryCount, byId uuid-guarded, entries, athlete history,
  active-athletes-with-repertoire, athletes-not-in-competition).
- **Display (pure):** `display/{competition-list, competition-entries, athlete-competitions}` +
  shared `display/competition-entry-view` (`ResultBadges`/`RoundList`/`EntryFeedback`/`EntryBody`).
- **Forms (client):** `forms/{competition-form, competition-entry-form}`.
- **Wizard + helpers (client):** `competition/{competition-wizard, add-athletes-form,
  remove-entry-button, remove-competition-button}`.
- **Routes:** `(coach)/competitions/{page, new/page, [id]/page}`.
- **Edited:** `(coach)/athletes/[id]/page.tsx` (Wedstrijden tab), `messages/nl.ts` (+`nl.competition.*`).

## Decisions / deviations

- **Wizard = client 5-step stepper (user-chosen).** CLAUDE.md says "wizard/stepper"; the codebase is
  otherwise server-driven (`?searchParam`). The user picked a real client stepper
  (`competition-wizard.tsx`) — steps **Wedstrijd → Atleten → Kata per ronde → Resultaten → Feedback**
  with progress dots + Terug/Volgende. It is the only client state machine in the app.
- **Persist-per-step, not one mega-submit.** A client stepper can't navigate away mid-flow, so its
  actions **return typed results and `revalidatePath` — they do NOT `redirect`**: `createCompetition`
  (`{ok,id}`), `addCompetitionAthletes` (`{ok,entries}`), `updateCompetitionEntry` (`{ok}`). The
  wizard calls them imperatively and advances on `ok`. Entries are inserted at the **Atleten** step
  (rows exist immediately) → abandoning the wizard leaves real, editable entries, not orphan drafts.
  Competition-level `updateCompetition`/`removeCompetition` (used outside the wizard) keep the redirect.
- **Atomic add via `db.batch()`** (convention 1; grounded via context7). `addCompetitionAthletes`
  batches the per-athlete INSERTs — implicit all-or-nothing transaction. Empirically verified: a batch
  with one bad-FK sibling rolls **both** inserts back (count unchanged). Idempotent — already-entered
  athletes are skipped.
- **Detail hub doubles as the edit surface.** `/competitions/[id]` shows info + entries + add-athletes;
  `?edit=1` swaps in the competition form; `?entry=<id>` swaps in the per-entry editor (server-driven,
  like Ch5 `?editKata` / Ch7 `?edit=1`). The entry editor's per-round kata `<select>`s come from the
  athlete's **competition** repertoire (fallback to full repertoire so they're never empty).
- **Round katas resolved via a kata id→name map** (reuse `getKataLibrary`) instead of 5 aliased
  self-joins. `features/competitions/entry.ts` exposes pure `entryKataIds`/`entryKataNames`, shared by
  the display layer and the summary.
- **One schema, two parse paths.** `competitionEntrySchema`: `category` required, all 17 content fields
  optional (`ENTRY_CONTENT_FIELDS` drives FormData parse + UPDATE-nulling). `ENTRY_ROUNDS` (5 rows:
  kata col + result col + nl label key) drives the form, parse, and display.
- **Pure summary helper** `summarizeAthleteCompetitions` (total / podium 1-2-3 / most-performed kata),
  Vitest-covered; the Wedstrijden tab + Ch10 reuse it.
- **No `mode` prop on the new display components** — like `feedback-list`/`feedback-detail`, coach vs
  public differs only by parent-injected affordances (`actions` slot / parent links), not internal
  behaviour, so the pure components need no `mode`. Convention 3 (no session, no actions) holds.

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (**24**) / **`build`** all clean (all three `/competitions*` routes
  in the manifest).
- Authed HTTP (port 3005): `/competitions` 200 (seeded Clubkampioenschap 2026 + Club badge + Bekijken
  + Nieuwe wedstrijd); `/competitions/new` 200 (wizard, all 5 step labels); `/competitions/{id}` 200
  (entry: U14 Kata Individueel, 2e, Finale, Heian Yondan **Winst** / Bassai Dai **Verlies**, feedback);
  `?edit=1` 200; `?entry={id}` 200 (editor + repertoire kata options + Deelname opslaan);
  `/athletes/{id}?tab=competitions` 200 (entry + Podium / Meest gelopen kata summary); malformed-uuid
  → 404; nonexistent-uuid → 404.
- DB read-back: `createCompetition` +1; `db.batch` add +2 **atomic** (bad-FK sibling → full rollback,
  count unchanged); `updateCompetitionEntry` UPDATEs the same row (feedback + placement persisted);
  cascade delete restores baseline. Entry feedback renders on **both** competition detail + athlete tab.
- Mode-contract grep: `display/{competition-*, athlete-competitions}` pure (ui + types + nl + pure
  feature helpers only; no `getSession`, no `features/*/actions`, no links/`use client`).

## Follow-ups

- Ch9 stats overview can reuse `summarizeAthleteCompetitions` + `getAthleteCompetitions` (win/loss per
  round, competitions-by-type still to add).
- Ch10 public portal renders `athlete-competitions` read-only in the viewer.
- Note: a manual browser-test competition ("hghg" / entry "iuyuyu") was left in the dev DB during the
  build — harmless throwaway data, not seed; clear at will.
