# Show all matches by default, filter by typing a city

Make the in-app Matches page behave like the public Play page: all matches everywhere are shown by default, and a traveler simply types "Barcelona" or "Marbella" to see matches there. No new screens, no travel mode.

## What changes for users

Today the Matches page opens with an "Around me" filter (only your saved profile areas), and you have to notice a small pill and switch it to "World".

After the change:

- The page opens showing **all upcoming matches**, everywhere.
- The search box is the main way to narrow down: type a city, club, or address.
- The pill flips its meaning: it now reads **"Only my areas"** and is **off** by default. Turning it on restricts the feed to your saved locations/zone.
- The empty-state hint changes from "Search worldwide" to "Show all areas" (only shown when the my-areas filter is on).

```text
Before:  [MATCHES]              (• Around me)   <- restricted by default
After:   [MATCHES]              ( Only my areas )  <- off by default, all matches shown
```

## Technical details

Single file: `src/routes/app.events.index.tsx`.

- Replace `const [worldwide, setWorldwide] = useState(false)` with `const [myAreasOnly, setMyAreasOnly] = useState(false)`; drop the derived `myAreasOnly = !worldwide`.
- Query key/args already read `myAreasOnly`, so the data call `list({ data: { city: null, needs: null, myLocations: myAreasOnly } })` is unchanged and now sends `false` on first load.
- Toggle pill (around line 285): label becomes "Only my areas" / "Solo mis zonas" / "Mes zones"; active (highlighted) state when `myAreasOnly` is true.
- Empty-state block (around lines 823-855): the `onExpandArea` callback becomes `setMyAreasOnly(false)` and the button text becomes "Show all areas" / "Ver todas las zonas" / "Voir toutes les zones", rendered only when `myAreasOnly` is true.
- Search box behaviour is untouched — it already filters by city, club name, and address across whatever the feed returned.

No database, RLS, or server-function changes.
