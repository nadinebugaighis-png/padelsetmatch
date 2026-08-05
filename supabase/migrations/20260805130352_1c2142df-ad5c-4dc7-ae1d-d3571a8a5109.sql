CREATE TABLE IF NOT EXISTS public.app_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  alert_key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_alerts_created_idx ON public.app_alerts (created_at DESC);

GRANT SELECT, UPDATE ON public.app_alerts TO authenticated;
GRANT ALL ON public.app_alerts TO service_role;

ALTER TABLE public.app_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read alerts" ON public.app_alerts;
CREATE POLICY "Admins can read alerts" ON public.app_alerts
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can ack alerts" ON public.app_alerts;
CREATE POLICY "Admins can ack alerts" ON public.app_alerts
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE INDEX IF NOT EXISTS app_events_kind_created_idx ON public.app_events (kind, created_at DESC);

CREATE OR REPLACE FUNCTION public.raise_app_alert(
  _kind text, _key text, _title text, _body text, _details jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted boolean := false;
  _admin record;
BEGIN
  INSERT INTO public.app_alerts (kind, alert_key, title, body, details)
  VALUES (_kind, _key, _title, _body, COALESCE(_details, '{}'::jsonb))
  ON CONFLICT (alert_key) DO NOTHING;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  IF NOT _inserted THEN
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

CREATE OR REPLACE FUNCTION public.check_app_health_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _win_start timestamptz := now() - interval '60 minutes';
  _sessions int;
  _crash_sessions int;
  _rate numeric;
  _raised int := 0;
  _sig record;
  _bucket text := to_char(date_trunc('hour', now()), 'YYYY-MM-DD"T"HH24');
BEGIN
  SELECT count(DISTINCT session_id) INTO _sessions
  FROM public.app_events
  WHERE created_at >= _win_start AND session_id IS NOT NULL;

  SELECT count(DISTINCT session_id) INTO _crash_sessions
  FROM public.app_events
  WHERE created_at >= _win_start AND session_id IS NOT NULL AND kind = 'crash';

  IF _sessions >= 10 THEN
    _rate := round((1 - (_crash_sessions::numeric / _sessions)) * 100, 1);
    IF _rate < 95 THEN
      IF public.raise_app_alert(
        'crash_free_drop',
        'crash_free_drop:' || _bucket,
        'Crash-free sessions dropped to ' || _rate || '%',
        _crash_sessions || ' of ' || _sessions || ' sessions crashed in the last hour.',
        jsonb_build_object('rate', _rate, 'sessions', _sessions, 'crash_sessions', _crash_sessions)
      ) THEN
        _raised := _raised + 1;
      END IF;
    END IF;
  END IF;

  FOR _sig IN
    SELECT sig, cnt FROM (
      SELECT
        (name || ': ' || left(COALESCE(message, ''), 80)) AS sig,
        count(*) AS cnt
      FROM public.app_events
      WHERE kind = 'crash' AND created_at >= _win_start
      GROUP BY 1
    ) recent
    WHERE NOT EXISTS (
      SELECT 1 FROM public.app_events old
      WHERE old.kind = 'crash'
        AND old.created_at < _win_start
        AND old.created_at >= now() - interval '14 days'
        AND (old.name || ': ' || left(COALESCE(old.message, ''), 80)) = recent.sig
    )
    ORDER BY cnt DESC
    LIMIT 5
  LOOP
    IF public.raise_app_alert(
      'new_crash_signature',
      'new_crash:' || md5(_sig.sig),
      'New crash: ' || left(_sig.sig, 90),
      _sig.cnt || ' occurrence(s) in the last hour — not seen in the previous 14 days.',
      jsonb_build_object('signature', _sig.sig, 'count', _sig.cnt)
    ) THEN
      _raised := _raised + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('sessions', _sessions, 'crash_sessions', _crash_sessions, 'raised', _raised);
END;
$$;

REVOKE ALL ON FUNCTION public.check_app_health_alerts() FROM PUBLIC, anon, authenticated;
