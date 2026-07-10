## Goal

Get the app to a clean, publish-ready state by removing every runtime dependency on `SUPABASE_SERVICE_ROLE_KEY` (which Lovable Cloud does not expose). Today the app throws "Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY" on several actions (push drain, some grid/feed lookups, coach, venues, match events, admin).

## Approach

For each `supabaseAdmin` call site, pick the smallest safe replacement:

1. **Reads the caller already owns** (their own hides/blocks/qa) → use `context.supabase` from `requireSupabaseAuth`. RLS already allows the owner to see these rows.
2. **Reads that need to bypass RLS for a legitimate reason** (reciprocal hides/blocks, push outbox, aggregate counts) → add a `SECURITY DEFINER` SQL function with `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE TO authenticated` (or `service_role`-only for outbox drain). Call it via `context.supabase.rpc(...)`.
3. **True admin ops** (bans, role grants, etc. in `admin.functions.ts`) → keep the admin import, but gate the whole function so it only runs for `has_role(..., 'admin')`. If Cloud truly can't run these, disable the UI paths behind a role check so end users never hit them.

## Files to touch

- `src/lib/app.functions.ts` — reciprocal hides/blocks/qa lookups in `getDiscoverFeed` → new `SECURITY DEFINER` RPC `discover_exclusions(_me uuid)` returning the excluded profile ids.
- `src/lib/notifications.functions.ts` — `drainPushOutbox` → SECURITY DEFINER RPC `claim_push_outbox(limit int)` that atomically marks rows sent and returns them; keep VAPID signing in Node (that part is fine).
- `src/lib/coach.functions.ts` — replace remaining admin reads with authed RLS or the existing `coach_stats` / `open_coach_chat` RPCs.
- `src/lib/venues.functions.ts` — replace admin reads with `shared_venues` / `venue_overlap_for_me` RPCs already in the DB.
- `src/lib/match-events.functions.ts` — swap admin reads for authed `context.supabase` (participants + events already have RLS for members).
- `src/lib/admin.functions.ts` — wrap every handler with a `has_role(userId, 'admin')` check before touching `supabaseAdmin`; if a specific op truly needs service role and Cloud blocks it, hide the UI action.

## Migration

One new migration adding:
- `discover_exclusions(_me uuid)` SECURITY DEFINER, returns `setof uuid`.
- `claim_push_outbox(_limit int)` SECURITY DEFINER, `UPDATE ... SET sent_at = now() WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING ...`.
- `REVOKE ALL ... FROM PUBLIC, anon` and `GRANT EXECUTE ... TO authenticated` on both.

## Verification

- Reload `/app/grid`, `/app/connect`, `/app/matches`, `/app/events`, `/app/profile`, coach profile with endorsements, notification bell — confirm no "SERVICE_ROLE_KEY" errors in console.
- Trigger a push (send a message) and confirm the outbox drains.
- Run the security scan; publish.

## Estimate

Single pass, ~1 turn of edits + 1 migration. After this the app should be publish-ready with no service-role dependency at runtime.
