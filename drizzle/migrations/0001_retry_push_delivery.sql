ALTER TABLE public.push_outbox ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.push_outbox ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.claim_pending_push_delivery(_limit integer DEFAULT 25) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 WITH picked AS (SELECT id FROM public.push_outbox WHERE sent_at IS NULL AND created_at > now() - interval '24 hours' AND delivery_attempts < 10 AND (claimed_at IS NULL OR claimed_at < now() - interval '2 minutes') ORDER BY created_at LIMIT GREATEST(1,LEAST(_limit,50)) FOR UPDATE SKIP LOCKED), claimed AS (UPDATE public.push_outbox p SET claimed_at=now(), delivery_attempts=delivery_attempts+1 FROM picked WHERE p.id=picked.id RETURNING p.*)
 SELECT jsonb_build_object('items',COALESCE(jsonb_agg(jsonb_build_object('id',c.id::text,'profile_id',c.profile_id,'title',c.title,'body',c.body,'url',c.url,'type',c.type,'subs',COALESCE((SELECT jsonb_agg(jsonb_build_object('endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth)) FROM public.push_subscriptions s WHERE s.profile_id=c.profile_id),'[]'::jsonb),'devices',COALESCE((SELECT jsonb_agg(jsonb_build_object('token',d.token,'platform',d.platform)) FROM public.device_tokens d WHERE d.profile_id=c.profile_id),'[]'::jsonb))),'[]'::jsonb)) INTO result FROM claimed c;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.claim_pending_push_delivery(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_delivery(integer) TO service_role;