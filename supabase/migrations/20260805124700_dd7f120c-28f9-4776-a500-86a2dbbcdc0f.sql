
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
      ), '[]'::jsonb)
    )), '[]'::jsonb)
  ) INTO v_result
  FROM claimed c;
  RETURN v_result;
END$function$;

CREATE OR REPLACE FUNCTION public.shared_venues(_a uuid, _b uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_me uuid; v_result jsonb;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL OR (v_me <> _a AND v_me <> _b) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  WITH shared AS (
    SELECT v.id, v.name, v.venue_type,
           pa.is_public AS a_public, pb.is_public AS b_public
    FROM public.profile_venues pa
    JOIN public.profile_venues pb ON pb.venue_id = pa.venue_id
    JOIN public.venues v ON v.id = pa.venue_id
    WHERE pa.profile_id = _a AND pb.profile_id = _b
  )
  SELECT jsonb_build_object(
    'count', COALESCE(count(*), 0),
    'names', COALESCE(jsonb_agg(name) FILTER (WHERE a_public AND b_public), '[]'::jsonb)
  ) INTO v_result
  FROM shared;
  RETURN v_result;
END$function$;

REVOKE ALL ON FUNCTION public.shared_venues(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shared_venues(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_push_outbox(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_push_outbox(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_signup_ordinal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_signup_ordinal(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated can view their own links" ON public.short_links;
CREATE POLICY "Authenticated can view their own links"
ON public.short_links
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
