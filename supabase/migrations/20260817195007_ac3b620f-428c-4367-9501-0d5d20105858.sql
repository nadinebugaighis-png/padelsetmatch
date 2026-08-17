REVOKE SELECT ON public.guest_participants FROM authenticated;
REVOKE SELECT ON public.guest_participants FROM anon;
GRANT SELECT (id, match_event_id, display_name, level, invited_by_profile_id, created_at) ON public.guest_participants TO authenticated;
GRANT ALL ON public.guest_participants TO service_role;

CREATE OR REPLACE FUNCTION public.host_get_guest_contacts(_event_id uuid)
RETURNS TABLE (guest_id uuid, display_name text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid;
BEGIN
  _me := public.my_profile_id();
  IF _me IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = _event_id AND me.host_profile_id = _me
  ) THEN
    RAISE EXCEPTION 'NOT_HOST';
  END IF;

  RETURN QUERY
  SELECT gp.id, gp.display_name, gp.phone
  FROM public.guest_participants gp
  WHERE gp.match_event_id = _event_id
  ORDER BY gp.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.host_get_guest_contacts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.host_get_guest_contacts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.host_get_guest_contacts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.host_get_guest_contacts(uuid) TO service_role;