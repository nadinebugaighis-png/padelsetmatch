Extend the Wimbledon "programme" light editorial treatment from the Grid page to the app shell and the remaining tab routes. No functionality changes — only visual tokens, typography, and surface styling.

Scope
1. App shell (`src/routes/app.tsx`)
   - Header: paper background, ink text, refined serif/wordmark treatment.
   - Invite banner: programme-card surface with ink text.
   - Bottom nav: paper background, ink icons/labels, active ink indicator.
2. Home hub (`src/routes/app.index.tsx`)
   - Convert the four hub cards to programme-card editorial tiles on paper.
   - Swap SVG artwork fills to paper/ink/grass accents.
3. Events tab (`src/routes/app.events.index.tsx`)
   - programme-page background.
   - Header, search, filters, calendar grid, and sheets in ink on paper.
   - Keep the 14-day/hour grid structure unchanged; only recolor surfaces.
4. Matches tab (`src/routes/app.matches.tsx`)
   - programme-page background.
   - Match list rows as programme-card items with ink text.
   - Unread badge in plum.
5. Profile tab (`src/routes/app.profile.tsx`)
   - programme-page background.
   - Hero card, detail chips, availability, feedback box as programme surfaces.
   - Chip utility overridden to ink-on-paper style.

Out of scope for this pass
- Detail routes (`/app/events/$eventId`, `/app/matches/$matchId`, `/app/events/$eventId/edit`, `/app/events/new`) keep their existing dark surfaces. They will be addressed in a follow-up if needed.

Tokens
- Background: `--paper` / `--paper-2`
- Text: `--ink`
- Accent: `--plum`, `--grass`
- Typography: `text-serif` (Playfair Display) for headings, Barlow for body.

No new dependencies. Build will be verified after edits.