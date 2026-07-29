CREATE TABLE public.profile_gear (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  brand text,
  note text,
  image_url text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX profile_gear_profile_idx ON public.profile_gear (profile_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_gear TO authenticated;
GRANT ALL ON public.profile_gear TO service_role;

ALTER TABLE public.profile_gear ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gear_select_authenticated" ON public.profile_gear
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "gear_insert_own" ON public.profile_gear
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE POLICY "gear_update_own" ON public.profile_gear
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE POLICY "gear_delete_own" ON public.profile_gear
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE TRIGGER profile_gear_updated_at BEFORE UPDATE ON public.profile_gear
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();