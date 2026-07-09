
-- Revoke direct public/anon/authenticated EXECUTE on SECURITY DEFINER helpers.
-- These are still callable server-side via service_role (supabaseAdmin) and by
-- Postgres itself when RLS policies evaluate them (owner runs the function body).

REVOKE EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.coach_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.open_coach_chat(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.coach_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.open_coach_chat(uuid) TO service_role;
