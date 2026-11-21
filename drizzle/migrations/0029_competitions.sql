CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  format text NOT NULL DEFAULT 'americana' CHECK (format IN ('americana','pozo','tournament','league','charity')),
  club_name text NOT NULL CHECK (char_length(club_name) BETWEEN 1 AND 120),
  city text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity smallint NOT NULL DEFAULT 16 CHECK (capacity BETWEEN 4 AND 128),
  level_note text CHECK (level_note IS NULL OR char_length(level_note) <= 60),
  description text CHECK (description IS NULL OR char_length(description) <= 1500),
  poster_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX competitions_starts_idx ON public.competitions(starts_at);

CREATE TABLE public.competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
GRANT SELECT, INSERT, DELETE ON public.competition_entries TO authenticated;
GRANT ALL ON public.competition_entries TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comp read" ON public.competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "comp create own" ON public.competitions FOR INSERT TO authenticated WITH CHECK (creator_profile_id = public.my_profile_id());
CREATE POLICY "comp update own" ON public.competitions FOR UPDATE TO authenticated USING (creator_profile_id = public.my_profile_id() OR public.is_current_user_admin()) WITH CHECK (creator_profile_id = public.my_profile_id() OR public.is_current_user_admin());
CREATE POLICY "comp delete own" ON public.competitions FOR DELETE TO authenticated USING (creator_profile_id = public.my_profile_id() OR public.is_current_user_admin());

CREATE POLICY "entry read" ON public.competition_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "entry join self" ON public.competition_entries FOR INSERT TO authenticated WITH CHECK (profile_id = public.my_profile_id());
CREATE POLICY "entry leave self" ON public.competition_entries FOR DELETE TO authenticated USING (profile_id = public.my_profile_id() OR EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.creator_profile_id = public.my_profile_id()));

CREATE OR REPLACE FUNCTION public.enforce_competition_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap int; n int; st timestamptz;
BEGIN
  SELECT capacity, starts_at INTO cap, st FROM public.competitions WHERE id = NEW.competition_id FOR UPDATE;
  IF st < now() - interval '1 day' THEN RAISE EXCEPTION 'This competition has finished'; END IF;
  SELECT count(*) INTO n FROM public.competition_entries WHERE competition_id = NEW.competition_id;
  IF n >= cap THEN RAISE EXCEPTION 'This competition is full'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER competition_capacity BEFORE INSERT ON public.competition_entries FOR EACH ROW EXECUTE FUNCTION public.enforce_competition_capacity();

CREATE POLICY "poster read" ON storage.objects FOR SELECT USING (bucket_id = 'competition-posters');
CREATE POLICY "poster upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'competition-posters' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "poster delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'competition-posters' AND (storage.foldername(name))[1] = auth.uid()::text);