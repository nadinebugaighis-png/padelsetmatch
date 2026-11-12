# Choose your location + area-only grid

## New player experience
1. Signs up as today.
2. The first page is **Choose your location**:
   - **Madrid · La Moraleja** (featured card)
   - **Madrid**
   - **London**
   - **Miami**
   - **Dubai**
3. They tap **Madrid · La Moraleja** and go to the normal profile page, already filled in:
   - Country: **Spain**
   - City: **Madrid**
   - Area 1: **La Moraleja**
   - Area 2 and 3: optional, empty
   Other choices pre-fill the same way: Madrid only fills Spain + Madrid; London fills UK + London; Miami fills USA + Miami; Dubai fills UAE + Dubai.
4. Everything else on the profile works as normal. They can still change any of it.

## The grid
- **World off (default):** you only see players who share one of **your areas**.
  - A La Moraleja player sees only La Moraleja players. Alcobendas, Las Tablas and the rest of Madrid are hidden.
  - Someone who put Las Tablas sees Las Tablas players.
  - If someone added a second area (e.g. La Moraleja + El Soto), they see players from both.
  - If someone only gave a city and no area, they see their whole city, as today.
- **World on:** you see every player on the app, from anywhere. Same switch as today.

## Current players
- No new screen, no pop-up. Their profile stays exactly as they filled it in.
- La Moraleja players: nothing changes except the grid now shows only La Moraleja players.
- Players with other areas see players from their own areas.
- Anyone can tap World to see everyone.

## Things to know
- Today the grid matches by **city** (all of Madrid together). This change makes it match by **area**, so some players will see fewer people. If someone ends up seeing nobody, the existing "Turn on World mode" button shows on the empty grid.
- Games on the Play page are not affected.

## Remembering and builds
- The location page shows once, right after signup. It's saved with their profile, so they won't see it again, and they stay signed in as today.
- No new App Store / Google Play builds are needed. A normal **Publish** brings it to phones.

---

## Technical details
- New route `src/routes/app.choose-location.tsx` (head metadata, brand tokens, EN/ES/FR). The new-user flow (where onboarding is entered after signup) sends people there first. The choice is passed to onboarding as search params (`country`, `city`, `area`), which pre-fill the first location block only when the profile has no saved locations yet. Players with existing locations never see the page.
- Location presets live in `src/lib/location-presets.ts`, with country/city names matching `src/lib/locations` entries.
- `getDiscoverFeed` in `src/lib/app.functions.ts`: replace `sharesMyCity` with `sharesMyArea`. If I have areas, a candidate must share a city+area pair. If I have only cities, fall back to the city match. Extracted as a pure helper with vitest tests: La Moraleja vs Alcobendas hidden, La Moraleja vs La Moraleja shown, the multi-area union, the city-only fallback, and World mode showing all.
- No database changes.
