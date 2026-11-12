# "Where do you live" + neighbour and club badges (open to everyone)

## The idea in one line
The app stays open to everyone, everywhere. It asks clearly where you **live** now, then shows who your neighbours are and who plays at your club. La Moraleja players will naturally see each other first.

## What a new player sees
1. Opens the app: same clean welcome page, taps GET STARTED, creates an account, same as today.
2. On the registration page, the location question changes to **"Where do you live?"**: city + neighbourhood, with a short note: *"Where you live now, not where you're from."*
3. A new optional **"Clubs you play at"** question, using the same club list as Profile.
4. Then the app opens normally. Everyone can use it, there's no waitlist and no locked screen.

## What changes in the profile questions
- **"Where do you play?"** (home, work, summer house, travelling) becomes **"Where do you live?"**: one city + one neighbourhood.
- **"Nationality / origin"** stays, moved lower and renamed **"Where are you from?"** so people stop mixing the two up.
- **"Your clubs"** can also be answered during registration (today it's only in Profile).
- All of it can still be changed in Profile.

## What players see on player cards
Short, friendly lines, shown only when true:
- **Neighbour · La Moraleja** (same neighbourhood)
- **Nearby · Alcobendas** (same city, different neighbourhood)
- **Plays at Club de Pádel La Moraleja** (shared club)

Neighbours and same-club players get a small boost on the grid, on top of level and compatibility. So a La Moraleja player sees La Moraleja players first, and a London player sees London players first.

## Your current 80 players
- Nothing changes for them and nobody gets a pop-up.
- What they already entered is reused automatically, so most badges work straight away.
- They can update "Where do you live?" in Profile whenever they want.

## "Will it remember me?"
Yes. Players stay signed in as today, and their answers are saved to their account. Nothing gets asked twice.

## "Do I need new App Store / Google Play builds?"
No. The phone apps load the live app, so a normal **Publish** brings everything to phones. You don't need a store review.

---

## Technical details
- Additive migration: `profiles.home_city`, `profiles.home_area` (nullable). Backfill from existing `zone` and the first encoded location. No new tables, no gating.
- `src/lib/neighbour-badges.ts`: pure function that compares viewer and player (same area / same city / shared venue) and returns badges plus a small score boost. It gets vitest tests (same area means Neighbour, same city with a different area means Nearby, a shared venue means club badge, no data means no badge).
- `app.onboarding.tsx`: swap the multi-block "Where do you play?" for a single live-in picker (existing `locations` lists), relabel nationality, and add an optional VenuesSection. Keep writing the legacy `zone`/locations fields so older scoring isn't wiped.
- Profile: the same "Where do you live?" field.
- Grid server function: add badges and the boost. Render them on the grid card and player preview.
