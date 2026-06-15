# Ch11 — PDF export

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch11).
> This file records what was built + decisions.

## Scope

Printable PDFs (CLAUDE.md "Print / PDF Export"): a branded **A4 feedback-form**, a **scoring-card
summary** (per kata), and an **athlete one-pager**. The PDFs render the *same data* the coach pages
already assemble — a print surface, not new data logic. Lib: `@react-pdf/renderer`.

## Files

- **New `src/lib/pdf/*` (server-only):** `styles.tsx` (brand hex + `StyleSheet` + `DocHeader`/
  `SectionTitle`/`Field`/`StatRow`/`Footer`), `feedback-sections.ts` (+ `.test.ts`),
  `feedback-document.tsx`, `scoring-document.tsx`, `athlete-document.tsx`, `http.ts`
  (`assertCoach`/`renderPdf`/`pdfResponse`/`isUuid`/`safeName`), `load.ts` (one-pager assembly).
- **New route handlers** (`runtime="nodejs"`, `dynamic="force-dynamic"`):
  `app/api/athletes/[id]/feedback/[feedbackId]/pdf/route.ts`,
  `app/api/athletes/[id]/scoring/[kataId]/pdf/route.ts`, `app/api/athletes/[id]/pdf/route.ts`
  (coach, session), `app/api/athlete/view/[token]/pdf/route.ts` (public, `view_token`).
- **Edited:** `next.config.ts` (`serverExternalPackages`), `messages/nl.ts` (`common.pdf`,
  `common.downloadPdf`, `pdf.*` titles), and the three button sites + portal overview
  (`feedback/[feedbackId]/page.tsx`, `athletes/[id]/page.tsx` overview+scoring tabs,
  `athlete/view/[token]/page.tsx`).

## Decisions / deviations

- **`serverExternalPackages: ["@react-pdf/renderer"]`** — `@react-pdf` ships its own React reconciler;
  bundling it triggers `ba.Component is not a constructor`. context7 (Next 16) confirmed this is the
  supported escape hatch (Turbopack-compatible). Combined with nodejs-runtime route handlers + the PDF
  module never imported by a client component, the reconciler runs as a plain Node dep.
- **Font = built-in Helvetica.** Zero-config, deterministic, no bundled binary / CDN fetch at render;
  satisfies CLAUDE.md's "Inter **or system font stack**". (Inter via a local `.ttf` = optional polish.)
- **`route.ts` + `createElement`, not `route.tsx`/JSX.** Keeps the handler files plain TS; avoids any
  ambiguity about JSX in route files. `renderPdf` (in `http.ts`) centralizes the two TS-lib casts
  `renderToBuffer` needs — its param is typed to a `<Document>` element (our wrappers carry their own
  props type), and the returned `Uint8Array` → `BodyInit` generic mismatch on `new Response`.
- **One render path, two auth modes for the one-pager.** `loadOnePager(athlete)` +
  `AthleteDocument` are shared; the coach route passes `includePhysicalNotes: true`, the public
  (token) route `false` — mirroring the portal's `mode="public"` (physical notes are coach-only).
- **Buttons are plain `<a target="_blank">`** (`buttonVariants` styling) — no client component, so
  nothing on the client imports `lib/pdf`. `Content-Disposition: inline` opens in the PDF viewer
  (print/save from there).
- **Testability split.** PDFs can't be visually unit-tested; the one genuinely testable bit is
  `feedbackSections` (U12-vs-U16 field selection, empties/empty-sections dropped) — unit-tested.
  Rendering is verified over HTTP (which exercises Next's real bundler — where the reconciler error
  would surface) + a `file`/`pdftotext` check.

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (**36**, +4 `feedback-sections`) / **`build`** all clean. Build
  registered all four `/api/**/pdf` routes as `ƒ`; `serverExternalPackages` accepted.
- HTTP (port 3005), sample athlete `ec1392d3-…`, token `70fdac30-…`:
  - **coach** one-pager / feedback / scoring (fresh session cookie) → **200**, `content-type:
    application/pdf`, body `%PDF-`, ~3–4 KB. `file` → "PDF document, version 1.3, **1 pages**".
  - **public** `/api/athlete/view/{token}/pdf` (no cookie) → **200** `%PDF-`; **bad token → 404**.
  - **auth enforced:** the three `/api/athletes/**` routes **without** a valid session → **401**
    (plain text, not a PDF). (Initial run with a stale cookie returned 401 across the board —
    re-login via Better Auth `sign-in/email` confirmed the coach routes then emit PDFs.)
  - `pdftotext` of the one-pager shows "Atletenoverzicht", "Sample Atleet · 14 jaar · 3e kyu ·
    Cadets", "Niveau 6/5", "Podium (1e/2e/3e)", footer "Lu Gia Jen · Coaching"; the feedback PDF shows
    "Feedbackgesprek", the meeting line, "DOELEN", brand footer.
- **Isolation grep:** no `"use client"` file imports `@/lib/pdf`; the only `getSession` in `lib/pdf`
  is `http.ts`'s `assertCoach` guard (intended — not a display component).

## Notes / follow-ups

- The public PDF endpoint (`/api/athlete/view/[token]/pdf`) is **not** behind the portal `proxy`
  rate-limiter (matcher is `/athlete/view/:path*`, not `/api/...`, and the limiter's token extraction
  assumes the portal path shape). Render is heavier than a page hit — a follow-up could add a
  dedicated limiter for the public PDF route.
- Helvetica → optional Inter via `Font.register` + a committed `.ttf` if exact brand-font fidelity is
  wanted later.
- Ch12 (polish: mobile / offline / hardening) is the last chapter.
