# Ch10 — Public athlete viewer portal

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch10).
> This file records what was built + decisions.

## Scope

A public, **no-auth, read-only** athlete profile at `/athlete/view/[token]` — what the athlete and
their parents see, opened via the non-guessable `view_token` link the coach shares. Renders the
**same** pure `components/display/*` in `mode="public"` (convention 3 paying off). Branded header
"Atleetprofiel — [Name]", ISR, IP+token rate-limit, `noindex` + `no-referrer`, token rotation.

## Files

- **New:** `app/athlete/view/layout.tsx` (branded shell, no nav/auth) ·
  `app/athlete/view/[token]/page.tsx` (server component, `generateMetadata` robots noindex,
  `revalidate = 300`) · `lib/rate-limit.ts` (+ `lib/rate-limit.test.ts`) · `src/proxy.ts` (Next 16
  middleware replacement) · `components/display/scoring-history-panel.tsx` (extracted) ·
  `components/athletes/rotate-link-button.tsx`.
- **Edited:** `lib/queries/athletes.ts` (+`getAthleteByViewToken`) · `features/athletes/actions.ts`
  (+`rotateViewToken`) · `components/display/competition-entry-view.tsx` +
  `components/display/athlete-competitions.tsx` (`mode` gating for `coachNotes`) ·
  `(coach)/athletes/[id]/page.tsx` (use the extracted panel; add `RotateLinkButton`) · `messages/nl.ts`
  (`nl.portal.*`, `athlete.rotateLink/rotateConfirm`).

## Decisions / deviations

- **Next 16 `proxy`, not `middleware`.** context7 confirmed Next 16 renamed `middleware`→`proxy`
  (file `proxy.ts`, named export `proxy`). The `proxy` runtime is **nodejs** (edge unsupported) — a
  bonus here: the in-memory limiter's module-scope state persists across requests within an instance.
- **In-memory rate-limit (user choice).** `createInMemoryRateLimiter` (fixed window, 30 req / 60 s,
  injectable clock) behind a `RateLimiter` interface, so a Redis-backed limiter (Upstash) can drop in
  for production without touching `proxy.ts`. Caveat: per lambda/instance, not distributed — basic
  abuse protection, logged in the module header.
- **`proxy` always runs (even on ISR-cached hits)**, so it both enforces the IP+token limit and sets
  `X-Robots-Tag: noindex, nofollow` + `Referrer-Policy: no-referrer` on every portal response. The
  page reads no request headers → stays as cacheable as its `searchParams` allow.
- **Extracted `ScoringHistoryPanel`.** The Scorekaarten visualization was inline JSX in the coach
  page. Pulled the pure part (radar + trend + per-criterion sparklines + history table +
  priority/strengths) into `display/scoring-history-panel.tsx` so coach + portal share one source
  (convention 3). Kata picker + "Nieuwe beoordeling" stay parent-injected (coach has them, portal
  doesn't). No `mode` needed — every field it renders is athlete-facing.
- **Privacy gating.** Competition `coachNotes` is coach-private; added `mode?: "coach" | "public"`
  (default coach) threaded `EntryFeedback`→`EntryBody`→`AthleteCompetitions` to hide it in the portal.
  The **Notes** tab (free-form coach notes) is omitted from the portal entirely (5 tabs, not 6).
  `StatsOverview` (physicalNotes), `KataRepertoire` (coach notes/actions), `AthleteHeader` (Inactief)
  already gated by `mode`. `FeedbackDetail` Side B is the parent-meeting content → shown.
- **Feedback** rendered as full read-only content: each form's `FeedbackDetail` inside a native
  `<details>`/`<summary>` disclosure — expandable with no client JS and no links.
- **Token rotation.** `rotateViewToken(athleteId)` action (`crypto.randomUUID()` UPDATE +
  `revalidatePath`) re-checks the session (convention 2). `RotateLinkButton` (confirm dialog) sits
  next to `ShareLinkButton`; rotation invalidates the old link immediately (old token no longer
  resolves → 404) and the refreshed page hands the new token to `ShareLinkButton`.
- **Deviation — dynamic, not static ISR.** The route is `ƒ` (server-rendered) because it reads
  `searchParams` for the kata picker / tab deep-link. `revalidate = 300` is set per the task, but the
  page renders on demand. The kata picker uses plain `<a>` (not `<Link>`) so prefetches don't consume
  the rate-limit budget.

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (**32**, +3 `rate-limit`) / **`build`** all clean. (The initial
  typecheck error was stale `.next/dev` route types from the running dev server; `build` regenerated
  them.)
- HTTP (port 3005), **no cookie**, token `70fdac30…`: valid token **200** with
  `x-robots-tag: noindex, nofollow` + `referrer-policy: no-referrer`; `<title>Atleetprofiel — Sample
  Atleet</title>` + `<meta name="robots" content="noindex, nofollow">`. All 5 tabs render; **no**
  Notities tab, **no** Bewerken / Nieuwe beoordeling / Deel link / Nieuwe link. Overview stats
  cross-checked vs psql (2 entries, 1×2nd → podium **0/1/0**, **Internationaal** present).
- Invalid (unknown uuid) + malformed token → **404**.
- **coachNotes gating (evidence, not assertion):** injected a marker into the seeded entry's
  `coach_notes` → coach competitions tab (authed) showed it (1), portal showed it (0) + no
  "Coach-notities" label; reverted to NULL.
- **Rotation:** swapped the token in psql → old URL **404**, new URL **200**; restored original → 200.
- **Rate-limit:** hammered a throwaway token 35× → first **30** pass-through (404), then **5 × 429**;
  trips at exactly the 30/60 s limit.
- **Mode/contract greps:** `scoring-history-panel.tsx` + the public page — no `getSession`, no
  `features/*/actions`, no edit links.

## Notes

- "Never send token to analytics": no analytics in the app today; `Referrer-Policy: no-referrer`
  stops the view-token (in the URL) leaking via the `Referer` header to any external resource.
- In-memory limiter is per server instance (user-accepted). Swap `portalRateLimiter` for an Upstash
  implementation of `RateLimiter` for a distributed guarantee in production.

## Follow-ups

- Ch11 (PDF export) and Ch12 (polish) remain. The portal's `mode="public"` displays are now the
  canonical read-only surface PDF export can mirror.
