---
name: kata-methodology
description: Torres / del Moral VLI kata training method for WKF Shotokan. Use when planning or reviewing kata training, computing VLI, choosing splits or workout formats, periodizing toward a competition, adapting for youth, or applying the coach's feedback philosophy.
---

# Kata methodology

Reference only. Vocabulary is `CONTEXT.md` at the repo root (Plan, Session, Block, Split, Section, Volume, Load, Intensity, Learning). Athlete state lives in the app, reached through the `lugiajen` MCP server, never in these files.

## Formulas the app uses

The app computes these in `src/features/training/vli.ts`. Plan with the same numbers.

- Split sizes: full 1, half 2, third 3, quarter 4. Sections are 1-based within the split: `2/4`, `3/3`.
- **Volume** = reps × rounds × number of sections in the block.
- **Load** = volume / split size (full-kata equivalents). Ceiling: 10 per kata per session.
- **Intensity** per block = section weight (quarter 1, third 2, half 4, full 5) + 0.5 when rest between reps ≤ 30s + 0.5 when ≤ 10s, capped at 5. Session intensity = volume-weighted mean, rounded to 0.5.
- **Duration** = reps × section seconds + rest between reps, per section; rest between sections and rounds from `restSectionSec`. Missing section timings make the estimate unknown; ask the coach to time them.
- A session counts as **done** once its date has passed unless it was skipped. Only log what did not happen.

## Split rules

| Category | Kata | Allowed splits |
|---|---|---|
| A | Gojushiho Sho, Gojushiho Dai, Kanku Sho | full, half, third, quarter |
| B | Kanku Dai, Sochin, Unsu, Enpi, Gankaku, Bassai Dai, Jion, Jitte, Hangetsu, Nijushiho, Meikyo, Chinte, Bassai Sho | full, half, third |
| C | all Heian, Tekki Shodan, Wankan | full, half |

`get_kata_library` returns `allowedSplits` per kata; the app rejects blocks outside it. Category B defaults to thirds with ~25% fewer reps and 5–10s more rest than quarter-based references. Kanku Dai is treated as A for VLI targets despite having no quarters.

## References

Open the one the question needs.

- `references/01-vli-reference-manual.md`: counting rules with worked examples, load thresholds per week out, intensity tables, per-age caps, planning checklist and red flags.
- `references/02-session-architecture-workout-catalog.md`: the six session parts with durations, the eight workout formats (Quarter Kata, EMOM, Beginning Blast, Burpee Endings, Leg Day, Upper Body, Circuit, Weight Vest) with reps, rest, rounds, taper and when to use each.
- `references/03-periodization-framework.md`: the 6-week competition model week by week (volume, load, intensity, circuit rounds, vest), back-to-back cycles, youth-scaled versions, 5-kata rotation.
- `references/04-youth-adaptation-guide.md`: U12 / U14 / U18 / U21 adaptations, once-per-week coaching, overtraining limits, motivation, section-size selection.
- `references/06-coaching-philosophy.md`: ownership mindset, relativeren, ranked technical priorities (kime first), external-focus cue language, feedback style per age, dojo equipment, what the coach wants in every plan.
- `references/07-shotokan-kata-reference.md`: per-kata movement counts and natural split points, per-category VLI phase targets, workout format adaptations per category, repertoire strategy vs Shito-ryu.

Raw sources (Karate Classroom transcripts, handwritten training sheets) sit in `claude_project/` for when a reference is ambiguous.
