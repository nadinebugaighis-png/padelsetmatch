CREATE OR REPLACE FUNCTION public.get_player_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles WHERE COALESCE(suspended_at, 'infinity'::timestamptz) > now() - interval '0 seconds';
$$;

REVOKE ALL ON FUNCTION public.get_player_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_count() TO anon, authenticated, service_role;