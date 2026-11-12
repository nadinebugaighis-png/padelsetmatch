# La Moraleja first: "Where do you live" + neighbour/club badges

## The idea in one line
PadelSetMatch becomes a private La Moraleja & North Madrid community for now. Everyone else can join a priority waitlist for their city.

## What a new player sees (step by step)
1. Opens the app → the same clean welcome page → taps GET STARTED → creates an account (Google, Apple or email), as today.
2. First question on the registration page: **"Where do you live?"** with a short note: *"The area you live in now — not where you're from."*
   - **La Moraleja & surroundings** (La Moraleja, El Soto, El Encinar, Alcobendas, Las Tablas, Sanchinarro…) → **Active now**
   - **Somewhere else** (Madrid Centro, rest of Spain, London, Dubai, other) → **"Coming soon"**
3. If La Moraleja area: they pick their exact neighbourhood, then the rest of registration continues as today (level, age, languages…), plus a new optional **"Clubs you play at"** step using the same club list as Profile.
4. If somewhere else: a polished "You're on the priority list for London" screen. They keep their account, can't see the grid or games, and you get a list of who's waiting per city in Admin.

## What changes in the profile questions
- **"Where do you play?"** (home, work, summer house, travelling) is replaced by **"Where do you live?"** → city + neighbourhood (one place, not three).
- **"Nationality / origin"** stays, moved lower with the clearer label **"Where are you from?"** so it's not confused with where you live.
- **"Your clubs"** becomes an optional question during registration (today it's only in Profile).
- Everything can still be changed later in Profile.

## What players see on player cards
Small, friendly lines on the grid card and player page, only when true:
- **Neighbour · La Moraleja** (same neighbourhood)
- **Nearby · Alcobendas** (same zone, different neighbourhood)
- **Plays at Club de Pádel La Moraleja** (shared club)
The grid gently ranks neighbours and same-club players a bit higher, on top of level and compatibility. Work/company is left out for now, as agreed.

## Your current 80 players
- **Nobody gets locked out.** Existing players keep full access.
- Next time they open the app they get one quick card: *"Confirm where you live"* (pre-filled from what they wrote before). One tap and done. It doesn't block them.
- Players whose old answer is outside the area keep access; you can decide later.

## "Will it remember me?"
Yes. Signed-in players stay signed in on phone and web, as today. The neighbourhood question is asked once and saved to their account; it never repeats unless they change it in Profile.

## "Do I need new App Store / Google Play builds?"
No. The phone apps load the live app, so everything arrives with a normal **Publish**. No store review needed.

## Admin
- New "Waitlist" list: city + count + names, so you know when London or Dubai is worth opening.
- One switch per zone to open it later (e.g. open "Madrid Centro" when it has enough players).

---

## Technical details
- DB migration (additive): `profiles.home_city`, `profiles.home_area`, `profiles.home_zone_status` ('active' | 'waitlist'), `profiles.home_confirmed_at`; new `launch_zones` table (key, name, areas[], is_open) with grants + RLS (read for authenticated, write admin via `has_role`). Seed La Moraleja zone in the migration. Backfill `home_city/home_area` from existing `zone`/encoded locations; existing users default to `active`.
- Zone rules in `src/lib/launch-zones.ts` (area → zone, isActive), with vitest tests: La Moraleja/El Soto/Alcobendas/Las Tablas → active; London/Madrid Centro → waitlist; existing users never waitlisted.
- `app.onboarding.tsx`: replace multi-block "Where do you play?" with single live-in picker; relabel nationality; add optional VenuesSection. Keep sending the legacy `zone`/locations fields so older scoring keeps working.
- Gate in `app.tsx` layout: waitlisted users routed to a new `app.waitlist.tsx`; public pages, deletion page and sign-out unaffected.
- Badges computed in the grid server function from viewer vs player `home_area`/zone and shared venues; rendered on grid card + player preview. Small ranking boost in existing scoring.
- One-time non-blocking "Confirm where you live" card on grid when `home_confirmed_at` is null.
- Admin: waitlist counts by city + zone open toggle in `app.admin.tsx`.
