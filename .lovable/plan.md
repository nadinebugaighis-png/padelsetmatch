## Goal
Let anyone share a match they created. Recipients open a public link, see the match, and can sign up with **just name + padel level** to join instantly. Full profile (photo, priorities, zones, etc.) becomes optional and can be completed later.

## What I'll build

### 1. Public shareable match page
- New public route `/m/$eventId` (top-level, SSR-enabled, no auth gate) that renders match details: host name, sport-level, date/time, club, address, players joined vs needed, gender/level tags.
- Uses a public server fn (publishable-key client, narrow `TO anon` SELECT on `match_events` + host profile name/level only — no PII).
- OG tags in `head()` from loader data so the link previews nicely on WhatsApp / iMessage.
- CTAs:
  - Signed in + onboarded → "Join this match" button (calls existing join fn).
  - Signed in + not onboarded → "Add your name & level to join" (goes to lite-onboarding, redirects back).
  - Not signed in → "Sign up to join" (goes to `/auth?redirect=/m/<id>&join=1`).

### 2. Lite onboarding (name + level only)
- New `/app/join-setup` (under `_authenticated` equivalent, i.e. `app.*`) that shows only:
  - First name
  - Padel level (beginner / intermediate / advanced / competitive)
  - Optional: primary city (prefilled from match's city so grid isn't empty)
- Saves a partial profile with an `onboarding_stage = 'lite'` flag. Discover grid / matches still require full onboarding, but joining a match does not.
- After save, if there's a pending `?join=<eventId>`, auto-join and route to the match page.

### 3. Full onboarding stays optional
- Existing multi-step onboarding becomes reachable from Profile ("Complete your profile") and from a soft banner on the app shell.
- Guard changes: routes that need a full profile (Discover, being matched-with) check `onboarding_stage === 'complete'`; joining/creating matches only needs `lite`.

### 4. Share affordance on match page
- On `/app/events/$eventId` (host + participants view), add a **Share** button using the existing `ShareQR` component with URL `https://<origin>/m/<eventId>`. Native share sheet + QR + copy link.

### 5. Auth flow tweak
- `/auth` reads `redirect` search param and returns there after sign-in/sign-up (already partially supported; verify + wire for `/m/*`).
- Default new signups to `onboarding_stage = 'lite'` (not `pending_full`) so they aren't forced into the long questionnaire.

## Data model changes
- `profiles.onboarding_stage text default 'none'` — values: `none` | `lite` | `complete`.
- Backfill: existing rows with photo+priorities → `complete`; others → `lite` if they have name+level else `none`.
- New public RLS policy: `TO anon SELECT` on `match_events` for open/full non-cancelled events (safe columns only via the server fn's column projection).
- New public RLS policy: `TO anon SELECT` on `profiles` for `id, first_name, level` **only** — enforced by column projection in the server fn, plus a `SECURITY DEFINER` function `public_match_view(eventId)` that returns a whitelisted shape. Simpler + safer than opening the whole table.

## Technical section
- Server fn `getPublicMatch(eventId)` in `src/lib/match-events.functions.ts` — no `requireSupabaseAuth`, uses server publishable client, calls `public_match_view` RPC.
- Server fn `saveLiteProfile({ first_name, level, city? })` with `requireSupabaseAuth`.
- Update `joinMatchEvent` to accept lite profiles (currently likely requires full profile — verify and relax).
- `src/routes/m.$eventId.tsx` (public) — loader → `getPublicMatch`, `head()` sets title/desc/OG/twitter from loader data, `errorComponent` + `notFoundComponent` required.
- `src/routes/app.join-setup.tsx` — lite form.
- `/auth` handles `redirect` param on all success paths (email, Google, Apple).

## Out of scope (ask if you want them)
- Guest RSVP without account (would need spam controls).
- SMS/email invites.

Approve and I'll ship it.