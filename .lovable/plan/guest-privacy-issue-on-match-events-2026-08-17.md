# Guest privacy issue on match events

## What's wrong

Guests who join a match by link are stored with a private phone number and a secret session token (the credential that lets them return to the match chat without an account).

Confirmed by inspecting the database:

- Any signed-in player who is a participant or host of the same match can read the **whole** guest row through the public data API — including the guest's **phone number** and their **session token**.
- The token is a bearer credential: whoever holds it can post messages, view the room, or leave the match **as that guest**.
- The app's own screens only ever request name/level, so this is not visible in the UI — but the API allows it, so a curious user can pull it directly.

Also confirmed: the phone number is promised to guests as "Only visible to the host", but today every co-participant can read it.

## The fix

1. **Stop exposing the secret columns.** Replace the blanket read permission on the guest table with a column-level permission that covers only: id, match event, display name, level, invited-by, created date. Phone and session token become unreadable through the data API by anyone except the backend.
2. **Give the host back the phone number** through a dedicated backend function that checks the caller is the host of that match, and returns only the phone for that match's guests. The match page shows it to the host only.
3. **Verify nothing breaks**: guest join, guest room/chat, guest cancel-by-phone, host lineup, Play feed guest avatars, and the admin views all continue to work — those already go through backend functions that run with elevated rights.
4. Record the resolution in security memory once verified.

## Technical notes

- Migration: `REVOKE SELECT ON public.guest_participants FROM authenticated, anon;` then `GRANT SELECT (id, match_event_id, display_name, level, invited_by_profile_id, created_at) ON public.guest_participants TO authenticated;` (keep `service_role` full). Existing RLS policy `Event participants can view guests` stays as the row filter.
- New `SECURITY DEFINER` function `host_get_guest_contacts(_event_id uuid)` returning `guest_id, display_name, phone`, guarded by `host_profile_id = my_profile_id()`, with `EXECUTE` granted to `authenticated` only.
- `src/lib/match-events.functions.ts` already selects only safe columns in `listMatchEvents` and `getMatchEvent`, so no query changes are needed there; add a thin server fn wrapping the new RPC and surface phones in the host lineup on `src/routes/app.events.$eventId.tsx`.
- `guest_*` RPCs are `SECURITY DEFINER` and validate the token internally, so they are unaffected by the revoke.
