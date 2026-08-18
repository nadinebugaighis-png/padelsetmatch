# Matches page: default to my areas, toggle to all matches worldwide

Make the in-app Matches page open showing only matches in the user's saved profile areas, with a clear toggle to switch to all matches worldwide and type any city.

## What changes for users

Today the Matches page opens with an "Around me" filter (only your saved profile areas), and you have to notice a small pill and switch it to "World". The behaviour is correct, but the toggle label and active state are confusing.

After the change:

- The page opens showing **matches in your selected areas only**.
- A pill at the top says **"All matches"** (off by default) or **"My areas"** (on by default).
- Tapping the pill switches to **all matches worldwide**; then the search box can be used to type "Barcelona" or "Marbella".
- The empty-state, when no matches are found in the user's areas, shows a button to **"Search all areas"**.

```text
Default:  [MATCHES]              ( My areas )   <- only your areas
Tapped:   [MATCHES]              ( All matches )  <- worldwide, type any city
```

## Technical details

Single file: `src/routes/app.events.index.tsx`.

- Keep `const [worldwide, setWorldwide] = useState(false)` so the default remains restricted to the user's areas.
- Rename the derived variable for clarity: `const myAreasOnly = !worldwide`.
- Toggle pill (around line 285): label becomes **"My areas"** / "Mis zonas" / "Mes zones" when `worldwide === false`, and **"All matches"** / "Todos los partidos" / "Tous les matchs" when `worldwide === true`. Active/highlighted state when `worldwide === false` (i.e. my-areas mode is on).
- Empty-state block (around lines 823-855): the `onExpandArea` callback stays `setWorldwide(true)` and the button text becomes **"Search all areas"** / "Buscar en todas las zonas" / "Rechercher partout".
- Search box behaviour is untouched — it already filters by city, club name, and address across whatever the feed returned.

No database, RLS, or server-function changes.
