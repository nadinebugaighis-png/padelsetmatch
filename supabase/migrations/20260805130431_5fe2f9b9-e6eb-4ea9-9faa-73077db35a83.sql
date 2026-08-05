CREATE OR REPLACE FUNCTION public.raise_app_alert(
  _kind text, _key text, _title text, _body text, _details jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows int := 0;
  _admin record;
BEGIN
  INSERT INTO public.app_alerts (kind, alert_key, title, body, details)
  VALUES (_kind, _key, _title, _body, COALESCE(_details, '{}'::jsonb))
  ON CONFLICT (alert_key) DO NOTHING;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN false;
  END IF;

  FOR _admin IN
    SELECT p.id AS profile_id
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (profile_id, type, title, body, url)
    VALUES (_admin.profile_id, 'admin_alert', _title, _body, '/app/admin');
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.raise_app_alert(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_ack_app_alert(_alert_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.app_alerts SET acknowledged_at = now() WHERE id = _alert_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ack_app_alert(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ack_app_alert(uuid) TO authenticated;
