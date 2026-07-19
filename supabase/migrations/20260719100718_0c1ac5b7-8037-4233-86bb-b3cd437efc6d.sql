
CREATE OR REPLACE FUNCTION public.guest_leave_by_phone(_event_id uuid, _phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_deleted int;
BEGIN
  v_norm := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  IF length(v_norm) < 4 THEN
    RETURN false;
  END IF;
  DELETE FROM public.guest_participants
   WHERE match_event_id = _event_id
     AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_norm;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.guest_leave_by_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_leave_by_phone(uuid, text) TO anon, authenticated, service_role;
