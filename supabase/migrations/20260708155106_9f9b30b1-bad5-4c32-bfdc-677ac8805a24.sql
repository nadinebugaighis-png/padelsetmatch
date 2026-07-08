
REVOKE EXECUTE ON FUNCTION public.handle_no_show() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_played_confirmation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_match_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_like() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_host_as_participant() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_match_event_full() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
