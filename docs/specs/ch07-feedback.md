# Ch7 — Feedback forms (U12 / U16)

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch7).
> This file records what was built + decisions.

## Scope

Parent-meeting feedback forms over the existing `feedback_forms` table (no schema change): two
age-specific templates (U12 / U16), auto-detected with manual override, a create + view/edit flow,
and the chronological Feedback tab. Independent of Ch5/6.

## Files

- **Feature:** `features/feedback/{form-type.ts (+test), schema.ts, actions.ts, values.ts}`.
- **Query:** `lib/queries/feedback.ts` (`getFeedbackForms` newest-first, `getFeedbackById` uuid-guarded).
- **Forms (client):** `forms/feedback-fields.tsx` (primitives + `FeedbackFormShell`),
  `forms/feedback-form-u12.tsx`, `forms/feedback-form-u16.tsx`.
- **Display (pure):** `display/feedback-list.tsx`, `display/feedback-detail.tsx`.
- **Routes:** `(coach)/athletes/[id]/feedback/{new, [feedbackId]}/page.tsx`.
- **Edited:** `(coach)/athletes/[id]/page.tsx` (Feedback tab), `messages/nl.ts` (+`nl.feedback.*`).

## Decisions / deviations

- **No new library.** base-nova still has no shadcn `Form` → reused the Ch4 native-FormData + RHF +
  server-authoritative zod pattern, and the Ch5 pure display-contract (`actions` slot, parent links).
- **Editable, not append-only.** Forms are "live-fillable" (the table has `updated_at`) →
  `createFeedback` INSERTs, `updateFeedback` UPDATEs the same row (count unchanged on edit).
- **One `feedbackSchema`:** header fields required (`meetingNumber` 1–3, `meetingDate` ISO, `season`,
  `formType`), all content fields optional. Each template posts only its own fields; the action's
  `toValues` nulls every content field that's absent, so editing clears removed values. `formType`
  is an immutable hidden field, so only one template's fields ever apply.
- **Auto-detect:** `recommendedFormType(age) = age <= 12 ? 'U12' : 'U16'`; the new-form page reads
  `?type=U12|U16` (two toggle links) defaulting to the recommendation. `currentSeason()` seeds the
  season (flips in August). Both unit-tested.
- **Edit via `?edit=1`** on the detail route (server-driven, like Ch5's `?editKata`): read-only
  `feedback-detail` by default, prefilled form with `?edit=1`; `updateFeedback` redirects to the detail.
- **Two thin template components** over a shared `FeedbackFormShell` (HeaderFields + Side A/goals via
  render-prop + CoachSection + ActionItems + RHF wiring) — satisfies BUILD-PLAN's two-file ask without
  duplicating the form boilerplate.
- **Detail route guards:** 404 when the form id is missing/malformed (uuid guard in `getFeedbackById`)
  or its `athleteId` ≠ the route's athlete.

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (21) / **`build`** all clean (both feedback routes in the manifest).
- Authed HTTP (port 3005): Feedback tab 200 (seeded U12 row + Bekijken + Nieuw feedback gesprek);
  `/feedback/new` 200 → **U16** (sample age 14) with U12↔U16 toggle, `?type=U12` swaps; U12 detail 200
  shows seeded values + Bewerken; `?edit=1` 200 (prefilled); a DB-inserted **U16** form renders the
  full U16 layout (ratings + process/performance/outcome goals + kata-focus) then cleaned up; bad id
  → 404; form under wrong athlete → 404.
- DB read-back: create grows `feedback_forms` count (2), delete restores (1); edit UPDATEs in place.
- Mode-contract grep: `display/feedback-*` pure (ui + types + nl only).

## Follow-ups

- Ch10 public portal renders `feedback-list` + `feedback-detail` in read-only `mode`.
- Ch11 PDF: branded A4 feedback-form export reuses these field groupings.
