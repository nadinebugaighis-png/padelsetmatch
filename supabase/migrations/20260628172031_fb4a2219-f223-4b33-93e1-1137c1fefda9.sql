
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_profile_id UUID NOT NULL,
  reported_profile_id UUID NOT NULL,
  reported_user_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_profile_id = public.my_profile_id());

CREATE TABLE public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_profile_id UUID NOT NULL,
  blocked_profile_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_profile_id, blocked_profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own blocks" ON public.blocks
  FOR SELECT TO authenticated
  USING (blocker_profile_id = public.my_profile_id());
CREATE POLICY "Users create own blocks" ON public.blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_profile_id = public.my_profile_id());
CREATE POLICY "Users delete own blocks" ON public.blocks
  FOR DELETE TO authenticated
  USING (blocker_profile_id = public.my_profile_id());
