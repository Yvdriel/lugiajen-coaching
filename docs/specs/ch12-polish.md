# Ch12 — Polish (mobile / offline / hardening)

> Authoritative task list + "Done when" gate live in [`BUILD-PLAN.md`](../../BUILD-PLAN.md) (Ch12).
> This file records what was built + decisions. Final chapter — app is feature-complete.

## Scope

Clear the cross-cutting polish debts: mobile shell, loading/error boundaries, competition-day
offline-tolerance, security hardening, and an a11y/empty-state pass. The gap survey found the **forms
were already responsive** (`sm:grid-cols-2`, full-width) — the real gaps were the app shell, missing
boundaries, no `viewport`, ephemeral wizard state, and headers only on the portal.

## Files

- **Shell:** new `components/layout/nav-links.ts` + `mobile-nav.tsx`; `sidebar.tsx` (className /
  `hidden md:flex`); `(coach)/layout.tsx`; `app/layout.tsx` (`viewport` export).
- **States:** new `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`,
  `components/loading-screen.tsx`, `app/(coach)/loading.tsx`.
- **Offline:** new `components/competition/wizard-draft.ts` (+ `.test.ts`); `competition-wizard.tsx`
  (rehydrate + persist + try/catch retry).
- **Hardening:** `next.config.ts` (`headers()`); new `docs/production.md`.
- **Copy:** `messages/nl.ts` (`nav.openMenu/closeMenu`, `error.*`).

## Decisions / deviations

- **Mobile nav, hand-rolled.** No shadcn Sheet installed, so `MobileNav` is a small client drawer:
  `md:hidden` sticky bar + hamburger → overlay + slide-over panel; closes on link/Esc/overlay; a11y via
  `aria-label`/`aria-expanded`/`aria-modal`, focus-the-panel, body-scroll-lock; `usePathname`
  highlights the active link. Desktop keeps the static `Sidebar` (`hidden md:flex`). Forms were
  already mobile-friendly, so this shell change is what makes flows "usable one-handed."
- **Offline = local-state buffering (user choice), no service worker.** Pure `wizard-draft.ts`
  serializes the wizard (`Set`→array) to `localStorage`; the component rehydrates on mount (a
  `skipNextSave` ref prevents the initial empty state from clobbering the stored draft before the
  restore commit) and clears it on a successful finish. Every action call is wrapped in `try/catch` →
  `setError(nl.error.network)` + `setBusy(false)`, keeping state so a blip is **retryable, not lost**.
  A full PWA/SW was deferred (heavier; buffering satisfies the gate).
- **`loading.tsx` vs `notFound()` status (deviation).** A `loading.tsx` makes its route **stream**, so
  the HTTP head flushes `200` before a programmatic `notFound()` can set `404`. This regressed Ch10's
  committed "invalid token **404s**" — so the **portal `loading.tsx` was removed** (portal is public +
  probe-able; 404 is the contract; it loads fast without a skeleton). Authed coach detail pages keep
  the streaming `(coach)/loading.tsx` and accept a cosmetic `notFound→200` (not indexed, invisible to
  the coach). `global-error.tsx` renders its own `<html><body>` (it replaces the root layout) and
  imports `globals.css` so Tailwind applies.
- **Global security headers** in `next.config.ts` `headers()` (all routes): `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS. The
  portal `proxy` still sets the stricter `no-referrer` for token URLs. **No strict CSP** — needs nonce
  wiring, documented as a follow-up.
- **Pagination intentionally skipped** — not a Ch12 task and the data is club-scale; recorded as a
  deferral in `docs/production.md` (add `limit`/`offset` to `lib/queries/*` if a list grows).

## Verification (ran clean)

- `pnpm typecheck` / `lint` / `test` (**39**, +3 `wizard-draft`) / **`build`** all clean.
- HTTP (port 3005), authed: `/dashboard` HTML has `<meta name="viewport" content="width=device-width
  …">`, the `md:hidden` mobile bar + `aria-label="Menu openen"`, and the `hidden md:flex` sidebar.
- `curl -D-` `/dashboard`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Strict-Transport-Security` all present; portal still `Referrer-Policy: no-referrer`.
- not-found: a bogus route → **404**; portal **bad token → 404** (restored after removing the portal
  `loading.tsx`); valid token → 200; the branded "Niet gevonden" page renders.
- `wizard-draft` unit tests cover serialize/parse round-trip + `null`/junk/wrong-shape → `null`.
  (Client `localStorage` rehydrate/retry can't be HTTP-tested — covered by the pure module + the
  in-component effects.)

## Follow-ups (in `docs/production.md`)

- Vercel project + first deploy (`db:migrate`/`db:seed`) — manual.
- Distributed rate-limit (Upstash impl of `RateLimiter`); limiter for the public PDF endpoint.
- Strict CSP (nonce). Pagination if lists grow.
