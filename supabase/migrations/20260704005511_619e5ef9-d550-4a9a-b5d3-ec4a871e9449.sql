
-- Extend compatibility_scores with structured reasons + friction line
ALTER TABLE public.compatibility_scores
  ADD COLUMN IF NOT EXISTS reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS friction text;

-- Feedback on the AI compatibility suggestion (thumbs up / down)
CREATE TABLE IF NOT EXISTS public.compatibility_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thumbs smallint NOT NULL CHECK (thumbs IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rater_profile_id, subject_profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compatibility_feedback TO authenticated;
GRANT ALL ON public.compatibility_feedback TO service_role;
ALTER TABLE public.compatibility_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own compat feedback read"
  ON public.compatibility_feedback FOR SELECT TO authenticated
  USING (rater_profile_id = public.my_profile_id());
CREATE POLICY "own compat feedback write"
  ON public.compatibility_feedback FOR INSERT TO authenticated
  WITH CHECK (rater_profile_id = public.my_profile_id());
CREATE POLICY "own compat feedback update"
  ON public.compatibility_feedback FOR UPDATE TO authenticated
  USING (rater_profile_id = public.my_profile_id())
  WITH CHECK (rater_profile_id = public.my_profile_id());

-- Post-play match rating: how good was the match in real life?
CREATE TABLE IF NOT EXISTS public.match_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  rater_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, rater_profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_ratings TO authenticated;
GRANT ALL ON public.match_ratings TO service_role;
ALTER TABLE public.match_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ratings I gave or received"
  ON public.match_ratings FOR SELECT TO authenticated
  USING (rater_profile_id = public.my_profile_id() OR rated_profile_id = public.my_profile_id());
CREATE POLICY "insert my own rating"
  ON public.match_ratings FOR INSERT TO authenticated
  WITH CHECK (rater_profile_id = public.my_profile_id());
CREATE POLICY "update my own rating"
  ON public.match_ratings FOR UPDATE TO authenticated
  USING (rater_profile_id = public.my_profile_id())
  WITH CHECK (rater_profile_id = public.my_profile_id());
