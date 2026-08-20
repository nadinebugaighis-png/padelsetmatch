# Fix: blocked/reported players show as "Unknown" with no photo

## What's happening

On the Hidden & blocked page (Me → Hidden & blocked), a player you blocked and reported appears as a blank avatar with the name "Unknown", so you can't tell who you are unblocking.

Confirmed cause: the list loads names and photos by reading the other player's profile as *you*. The database rule for reading profiles hides any suspended account, and reporting auto-suspends a player once three different people have reported them (one account is suspended in the database as of today). The row for a suspended — or otherwise unreadable — player therefore comes back empty, and the page falls back to "Unknown" with a grey circle.

Note: reporting also auto-blocks the reported player from your side, so a reported player normally lands in this same list.

## The fix

1. Add a small read-only database function that returns only the display fields (id, first name, photo, zone) for the exact players the signed-in user has hidden or blocked — including suspended ones. It returns nothing for anyone else, so it can't be used to browse suspended accounts.
2. Use that function in the Hidden & blocked loader instead of the direct profile read, so every hidden/blocked row shows the real name and photo.
3. Keep a graceful label: if a player has genuinely deleted their account, show "Deleted player" instead of "Unknown".
4. Show a small "Suspended" note on rows whose account is suspended, so it's clear why they no longer appear anywhere else.

## Technical details

- New `security definer` function `public.get_my_hidden_blocked_profiles()` returning `id, first_name, photo_url, zone, suspended_at`, restricted to profile ids present in `hides.hidden_profile_id` / `blocks.blocked_profile_id` for `my_profile_id()`. `GRANT EXECUTE` to `authenticated` only (no `anon`, no `public`).
- `getHiddenAndBlocked` in `src/lib/app.functions.ts` swaps its `profiles ... .in("id", ids)` query for `context.supabase.rpc("get_my_hidden_blocked_profiles")`.
- `src/routes/app.hidden.tsx` renders the suspended note and the "Deleted player" fallback.

No change to blocking, reporting, or moderation behaviour.
