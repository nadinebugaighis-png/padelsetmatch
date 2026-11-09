CREATE TABLE public.app_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'share_sheet',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_shares_profile_idx ON public.app_shares (profile_id, created_at DESC);

GRANT SELECT ON public.app_shares TO authenticated;
GRANT ALL ON public.app_shares TO service_role;
ALTER TABLE public.app_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players see their own shares" ON public.app_shares
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins see all shares" ON public.app_shares
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Records one app share for the signed-in player; repeated taps within 30s count once.
CREATE OR REPLACE FUNCTION public.record_app_share(_channel text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
  _ch text := CASE WHEN _channel IN ('share_sheet', 'whatsapp', 'copy_link') THEN _channel ELSE 'share_sheet' END;
BEGIN
  SELECT id INTO _pid FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF _pid IS NULL THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.app_shares
    WHERE profile_id = _pid AND created_at > now() - interval '30 seconds'
  ) THEN RETURN; END IF;
  INSERT INTO public.app_shares (profile_id, channel) VALUES (_pid, _ch);
END;
$$;
REVOKE ALL ON FUNCTION public.record_app_share(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_share(text) TO authenticated;

-- Admin-only leaderboard of players who shared the app.
CREATE OR REPLACE FUNCTION public.admin_top_sharers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.shares DESC, t.last_shared_at DESC)
    FROM (
      SELECT p.id AS profile_id, p.first_name, p.photo_url,
             count(s.id)::int AS shares,
             max(s.created_at) AS last_shared_at
      FROM public.app_shares s
      JOIN public.profiles p ON p.id = s.profile_id
      GROUP BY p.id, p.first_name, p.photo_url
    ) t
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_top_sharers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_top_sharers() TO authenticated;