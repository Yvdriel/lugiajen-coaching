# Ch9 — Athlete stats overview

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch9).
> This file records what was built + decisions.

## Scope

Fill the athlete profile's **Overzicht** tab with the at-a-glance stats panel CLAUDE.md specifies:
total competitions · podium 1/2/3 · win/loss per round · competitions by type · most-performed
competition kata · current competition repertoire + proficiency · active goals (latest feedback) ·
physical profile · current focus points (latest feedback + scoring cards). Depends Ch5–8.

## Files

- **New:** `lib/athlete-stats.ts` (pure assembler + exported aggregators) + `lib/athlete-stats.test.ts`.
- **Filled:** `components/display/stats-overview.tsx` (the Ch4 shell → 5 real panels, stays pure).
- **Edited:** `(coach)/athletes/[id]/page.tsx` (Overzicht tab passes `stats`), `messages/nl.ts`
  (+`nl.athlete.overview.*`).

## Decisions / deviations

- **Pure assembler, not a query file.** BUILD-PLAN named `lib/queries/athlete-stats.ts`, but the
  profile page already loads every source row in its `Promise.all` (competitions, repertoire,
  latestCards, feedback, kataNames). So Ch9 is `lib/athlete-stats.ts` — `buildAthleteStats(input)`
  computes the stats object from those rows: **zero extra DB round-trips** (convention 4), directly
  Vitest-able, and reusable by Ch10's portal (same rows). Same testable-aggregation intent.
- **Reuse + extend.** `summarizeAthleteCompetitions` (Ch8) gives total/podium/most-kata; Ch9 adds the
  two it lacks — `competitionsByType` (count per type, canonical order) and `winLossPerRound` (tally
  `win`/`loss` across the five `ENTRY_ROUNDS` result columns, empty rounds dropped). Both exported +
  unit-tested.
- **Goals** = latest feedback (`feedback[0]`), non-empty `goalMain/goalPerformance/goalOutcome/kataFocus`
  only; `null` when there's no feedback or all goal fields are blank.
- **Focus points** merge two sources — latest feedback (`coachDevelopmentArea` + `action1..3`) then the
  latest scoring cards' `priorityImprovements` — feedback-first, trimmed, **deduped**, so the panel
  doesn't bloat or repeat.
- **Display stays pure** (convention 3): `stats-overview` renders the passed `AthleteStats`; imports
  only `ui/card` + the `AthleteStats` type + `nl`. `mode` keeps gating physical notes; stats render in
  both coach + public (athlete/parent-facing). Copy moved to `nl.athlete.overview.*`; reuses
  `nl.competition.{types,rounds}`, `nl.kata.proficiency`, `nl.feedback.fields.*`.

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (**29**, +5 athlete-stats) / **`build`** all clean.
- Authed HTTP (port 3005) `/athletes/{sample}?tab=overview` 200 — values cross-checked against raw
  `psql` aggregates and matched exactly: **Wedstrijden 2**, **Podium 0/1/0**, **Club 1 +
  Internationaal 1**, **Ronde 1 2–0**, **Finale 0–1**, most kata **Heian Yondan**, repertoire
  **Heian Yondan Niveau 6** / **Bassai Dai Niveau 5**, active goal "Elke training op tijd en
  gefocust.", focus points "Snelheid in eindsequentie." + "Twee keer per week extra core-oefeningen.".
  (RSC splits `{wins}–{losses}` across text nodes — verified after stripping comment markers.)
- Vitest: `buildAthleteStats` over crafted input (podium/byType/round-tally/repertoire-filter/goal-
  cleaning/focus-dedupe) + empty input (`totalEvents 0`, `byType []`, `rounds []`, `goals null`,
  `focusPoints []`).
- Mode-contract grep: `display/stats-overview.tsx` pure (ui + type + nl only).

## Notes

- The seeded Sample athlete now has **2** competition entries — the seeded Clubkampioenschap one plus a
  leftover manual browser-test entry (international); the Overzicht panel correctly reflects both.
  Harmless dev residue; clear at will.

## Follow-ups

- Ch10 public portal calls `buildAthleteStats` with the same rows and renders `stats-overview` in
  `mode="public"`.
