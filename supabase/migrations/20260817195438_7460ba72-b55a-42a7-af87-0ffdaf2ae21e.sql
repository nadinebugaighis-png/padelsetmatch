CREATE OR REPLACE FUNCTION public.guest_recover_token(_event_id uuid, _phone text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tok uuid;
  _norm text;
BEGIN
  _norm := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  IF length(_norm) < 4 THEN
    RETURN NULL;
  END IF;

  SELECT gp.session_token INTO _tok
  FROM public.guest_participants gp
  WHERE gp.match_event_id = _event_id
    AND right(regexp_replace(gp.phone, '[^0-9]', '', 'g'), 9) = right(_norm, 9)
  ORDER BY gp.created_at DESC
  LIMIT 1;

  RETURN _tok;
END;
$$;

REVOKE ALL ON FUNCTION public.guest_recover_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_recover_token(uuid, text) TO anon, authenticated, service_role;