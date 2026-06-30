
CREATE TABLE public.hides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hider_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hider_profile_id, hidden_profile_id)
);
GRANT SELECT, INSERT, DELETE ON public.hides TO authenticated;
GRANT ALL ON public.hides TO service_role;
ALTER TABLE public.hides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read hides" ON public.hides FOR SELECT TO authenticated
  USING (hider_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner insert hides" ON public.hides FOR INSERT TO authenticated
  WITH CHECK (hider_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "owner delete hides" ON public.hides FOR DELETE TO authenticated
  USING (hider_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
