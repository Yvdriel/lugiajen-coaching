# Ch6 — Scoring-card visualizations

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch6).
> This file records what was built + decisions.

## Scope

Makes the Ch5 scoring history legible: radar of the latest card, overall-impression trend line,
per-criterion sparklines, and color-coded delta cells in the bulk history table. No schema change —
all reads go through `lib/queries/scoring.ts`.

## Files

- **New charts (`components/charts/`, client, pure):** `score-radar-chart.tsx` (latest card's 12
  criteria, technical+athletic), `score-trend-chart.tsx` (overall impression over dates),
  `trend-sparkline.tsx` (tiny fixed-size axis-less line; reused on the Kata tab + per-criterion grid).
- **Enhanced display:** `display/score-history-table.tsx` (green/red delta cells),
  `display/kata-repertoire.tsx` (+`trend: number[]` on the item, "Verloop" sparkline column).
- **Query:** `lib/queries/scoring.ts` +`getScoringSeriesByKata(athleteId)` → `Map<kataId, number[]>`
  (overall impression oldest→newest).
- **Edited:** `(coach)/athletes/[id]/page.tsx` (Scorekaarten: radar + trend + per-criterion grid
  above the table; Kata: pass `trend`), `messages/nl.ts` (`scoring.charts.*`, `kata.trend`).
- **Added dep:** `recharts@3.8.0` + `components/ui/chart.tsx` via `shadcn add chart`.

## Decisions / deviations

- **Recharts via shadcn `chart`** (base-nova). Bundles clean under Turbopack/Next 16 — no
  `transpilePackages`/`serverExternalPackages` fallback needed. React 19 supported (peerDeps).
- **Monochrome + one exception:** charts use the brand's grayscale `--chart-1..5` tokens. The single
  functional color in the app is the green/red on the **history-table delta cells**, which
  `CLAUDE.md` explicitly mandates (improved / declined; unchanged = none).
- **Charts are pure client display components** in `components/charts/` (props only, no
  getSession/actions/links) so Ch10's public portal reuses them; `score-history-table` stays in
  `display/` and was enhanced in place.
- **Data:** Scorekaarten charts derive from the already-loaded `history` (no new query); only the
  Kata-tab sparklines needed `getScoringSeriesByKata`. Radar excludes `overallImpression` (the
  summary) → 12 criteria via `NUMERIC_CRITERIA.filter(c => c.group !== 'overall')`.
- **Render guards:** radar needs ≥1 card, trend + per-criterion grid + sparklines need ≥2 (else "—"
  / "minimaal 2 beoordelingen").
- Sparklines are fixed-size (no ResponsiveContainer) so they stay cheap in table rows; Y domain
  pinned 1–10 so they're comparable across kata.

## Recharts SSR note

`ChartContainer` wraps `ResponsiveContainer`; Recharts measures on the client, so SSR mounts the
chart **wrappers** but draws most inner SVG after hydration. HTTP verification therefore asserts
wrapper/surface/title/colour markup, not full SVG paths — the visual render is a browser step.

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (17) / **`build`** all clean (Recharts compiles; no bundling error).
- Authed HTTP (port 3005): Scorekaarten tab 200 — 2 chart surfaces + 15 chart wrappers (radar +
  trend + 13 sparklines), titles "Huidige scores / Verloop algemene indruk / Verloop per criterium",
  **24 emerald cells / 0 red** (all seeded Heian deltas improve). Kata tab 200 — Heian row sparkline
  wrapper present; Bassai (0 cards) shows "—".
- Mode-contract grep over `components/display` + `components/charts`: clean (no session/actions).

## Follow-ups

- Ch10 public portal renders these same charts in `mode="public"`.
- Ch11 PDF: charts are client/SVG — the PDF scoring summary will re-derive from data, not embed these.
