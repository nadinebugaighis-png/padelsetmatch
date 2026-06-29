
CREATE TABLE public.match_reads (
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_reads TO authenticated;
GRANT ALL ON public.match_reads TO service_role;
ALTER TABLE public.match_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own match reads" ON public.match_reads
  FOR ALL TO authenticated
  USING (profile_id = public.my_profile_id())
  WITH CHECK (profile_id = public.my_profile_id());
