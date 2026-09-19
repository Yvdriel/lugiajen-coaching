---
name: training-planning
description: Plan, log and review kata training for a Lu Gia Jen athlete through the lugiajen MCP server. Use when asked to plan a week or cycle, write a session, log what happened, review VLI or progress, debrief a competition, or record a learning.
---

# Training planning

Method and formulas: invoke `kata-methodology`. Data: the `lugiajen` MCP server (`.mcp.json`; needs `LUGIAJEN_MCP_TOKEN`, and `LUGIAJEN_MCP_URL` for production).

## 1. Always first

Call `get_athlete_context` for the athlete (`list_athletes` to find the id). Read, in this order: `learnings` (what past sessions taught), `athlete.physicalNotes`, `repertoire` (`allowedSplits`, `latestOverall`, `latestCard.priorityImprovements`), `goals` and `openActions`, `competitions` (last three, with reflections), `availability`, `activePlan.thisWeek.target`, `recentWeeks`, `timings`. Done when you can state in one line where the athlete stands: phase, this week's target vs actual load, the top technical priority, and the next competition.

## 2. New plan

1. Target competition: `list_competitions` (upcoming). Missing: `create_competition`, then `add_competition_entry` per athlete and category.
2. `suggest_plan_weeks` with the competition date and the athlete's age gives the 6-week table, age-capped. Adjust rows when `learnings` or `recentWeeks` say the athlete needs less (injury, low recent load) and say why.
3. `create_plan` with `targetCompetitionId` and those `weeks`.
4. Report the week table to the coach.

## 3. Plan a week

1. One session per `availability` slot. Coach-led slots carry the technical work (part 5); other slots carry review and workouts.
2. Part 5: one kata per day, rotating the repertoire so every competition kata gets a technical day; part 6: three other kata in a catalog format. Weakest `latestOverall` gets the coach-led day.
3. Every kata block uses a split in that kata's `allowedSplits`. Category B defaults to thirds.
4. Every session has a part 2 block (S&C) or a stated reason it is absent. Include the part 1 warm-up as a block with minutes.
5. Load per kata per session ≤ 10; weekly total against `activePlan.thisWeek.target`.
6. `create_sessions` with `athleteIds` (group training = all attendees) and the blocks. Omit `planId`; it attaches to the active plan.
7. Read back `list_sessions` for the week. Report to the coach in sheet notation, one line per block: `Enpi 1/3-2/3-3/3 ×10 | 30s | 2min`, then per-session V / L / I and duration, and the weekly total vs target. Name any `missingTimings` and ask for seconds.

Done when every slot has a session, every kata block passed validation, and the weekly load sits within one full-kata equivalent of target or the deviation is explained.

## 4. Log a week

Sessions are assumed done. Ask the coach only what did not happen. `skip_session` for a missed training; `update_block` with `skipped` or `actualReps` for partial work. Then `get_weekly_vli` and report actual vs target.

## 5. After a competition, scoring card or feedback gesprek

Competition: `update_competition_entry` with kata per round, results, placement, and the four feedback fields as the coach tells them (ownership framing, relativeren). Scoring: `create_scoring_card` with all 12 criteria the coach dictates; read `get_scoring_history` first so the coach sees the deltas. Repertoire change decided: `assign_kata`, `update_athlete_kata`, `remove_athlete_kata`. Injury or limitation changed: `update_athlete_notes.physicalNotes` for the current summary.

Then write what was learned with `add_learning`: `athleteId`, `source` (`competition`, `scoring_card`, `feedback`, `session`), `sourceId` (the competition, card, form or session id), tags from `technical`, `physical`, `mental`, `competition`, `structure`, `warmup`. One learning per finding, phrased so it still reads correctly in six months. A finding about coaching in general, not this athlete: omit `athleteId`. The coach deletes wrong learnings in the app; never rewrite one; `delete_learning` when the coach says one is wrong.

Quick coach observation, not an insight: `add_athlete_note`.

## 6. Progress review

`get_kata_progress` gives, per kata, each scoring card with the VLI done between it and the previous card, per section. Read the deltas against the load and say which sections got work and which did not before judging whether load explains growth. Growth per section is not measurable; scoring is per kata.

## 7. Gesprek prep and group planning

Before a feedback gesprek: `get_athlete_timeline` (defaults to since the last completed gesprek) and `list_feedback` for goal and action status. Planning a group session or deciding who needs attention: `get_group_overview`, one row per active athlete with this week's load vs target, last card, next competition, open actions and availability.

## Style

Direct, specific, VLI numbers in every plan, external-focus cues for corrections, section terminology `first third` / `2/3`, Dutch athlete-facing text.
