CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own device tokens"
ON public.device_tokens
FOR ALL
TO authenticated
USING (profile_id = public.my_profile_id())
WITH CHECK (profile_id = public.my_profile_id());

CREATE OR REPLACE FUNCTION public.claim_push_outbox(_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb; v_me uuid;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  WITH picked AS (
    SELECT id FROM public.push_outbox
     WHERE sent_at IS NULL AND profile_id = v_me
     ORDER BY created_at ASC
     LIMIT GREATEST(1, LEAST(_limit, 200))
     FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.push_outbox po
       SET sent_at = now()
      FROM picked
     WHERE po.id = picked.id
    RETURNING po.id, po.profile_id, po.title, po.body, po.url, po.type
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id, 'profile_id', c.profile_id, 'title', c.title,
      'body', c.body, 'url', c.url, 'type', c.type,
      'subs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
        FROM public.push_subscriptions s WHERE s.profile_id = v_me
      ), '[]'::jsonb),
      'devices', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('token', d.token, 'platform', d.platform))
        FROM public.device_tokens d WHERE d.profile_id = v_me
      ), '[]'::jsonb)
    )), '[]'::jsonb)
  ) INTO v_result
  FROM claimed c;
  RETURN v_result;
END$function$;

REVOKE ALL ON FUNCTION public.claim_push_outbox(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_push_outbox(integer) TO authenticated, service_role;