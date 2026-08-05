CREATE TABLE public.app_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('crash','error','event','screen')),
  name text NOT NULL,
  message text,
  stack text,
  route text,
  session_id text,
  user_id uuid,
  platform text,
  app_version text,
  user_agent text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX app_events_created_at_idx ON public.app_events (created_at DESC);
CREATE INDEX app_events_kind_created_idx ON public.app_events (kind, created_at DESC);

GRANT ALL ON public.app_events TO service_role;
GRANT SELECT ON public.app_events TO authenticated;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read app events"
ON public.app_events FOR SELECT TO authenticated
USING (public.is_current_user_admin());