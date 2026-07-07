## Goal

Make finding and calling a padel match nearly one-tap. Replace the current "Find matches" list and long "Call a match" form with a single 14-day × hourly grid where users mark themselves available. A match auto-creates when a slot is tapped; other players join it with one tap. Club and invites become optional follow-ups, not blockers.

## The grid

- Rows: hours 07:00 → 23:00 (17 slots).
- Columns: today + next 13 days (horizontally scrollable, sticky day header, sticky hour column).
- Each cell shows:
  - Empty → subtle dot, tap = "I'm available".
  - 1–3 players → up to 3 mini avatars + `N/4` counter; tap = join.
  - Full (4) → filled racket-green pill; tap = open chat/detail.
  - You're in it → highlighted ring.
- Long-press / secondary tap on a cell you host → quick sheet to add club, invite friends, edit level/gender.

## Tap flow (minimum clicks)

1. Tap empty slot → instant availability created (auto-defaults: mixed, your level, no club yet). Toast: "You're in. Add a club or invite friends?" with two chips.
2. Tap a slot with players → instant join (same friction as list view today).
3. Optional follow-ups from the toast or the slot sheet:
   - Add club (opens existing ClubPicker inline).
   - Invite players (opens existing invite flow).

No mandatory form. The detailed form remains reachable via a small "Advanced" link for power users (mirrors the current MatchForm).

## Icon change

Swap the `Play`-style icons on home banners / CTAs for a padel racket icon. Lucide has no racket, so use a small inline SVG component `RacketIcon` (oval head with strings + short handle) and replace usages in banners on `src/routes/app.index.tsx`, `src/routes/index.tsx`, and the "call a match" CTA.

## Scope of file changes

- `src/routes/app.events.index.tsx` — rewrite as `ScheduleGrid` (keep filters collapsed, keep worldwide/my-areas toggle, keep i18n).
- `src/components/RacketIcon.tsx` — new inline SVG icon.
- `src/routes/app.index.tsx`, `src/routes/index.tsx` — replace play icons with `RacketIcon` in the hero/CTA banners.
- `src/lib/match-events.functions.ts` — add `quickCreateMatchEvent({ starts_at })` that inserts a minimal event (default level range, mixed, no club) and returns id. Keeps existing `createMatchEvent` for the advanced form.
- Keep `app.events.new.tsx` reachable but downgrade its entry point to "Advanced" from the grid header.

## Technical notes

- Grid built as CSS grid with `sticky` first column/header row; mobile-first, 56px cell height, horizontal scroll snap per day column.
- Uses existing `listOpenEvents` output — bucket events by `(day, hourFloor)` into a Map for O(1) cell lookup.
- Quick-create hits `quickCreateMatchEvent` then optimistically inserts into the query cache and opens a lightweight bottom sheet with "Add club" / "Invite" / "Done".
- Follow-up sheet reuses `ClubPicker` and the existing invite server fn — no new backend work beyond the quick-create wrapper.
- No DB schema change; `club_name` becomes nullable in UI ("Location TBD" placeholder). If DB requires non-null, quick-create writes `"TBD"` and the detail page prompts host to set it.
