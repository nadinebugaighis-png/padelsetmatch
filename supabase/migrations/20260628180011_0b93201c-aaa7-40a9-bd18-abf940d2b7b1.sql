
REVOKE EXECUTE ON FUNCTION public.handle_no_show() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_played_confirmation() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_match_activity() FROM public, anon, authenticated;
