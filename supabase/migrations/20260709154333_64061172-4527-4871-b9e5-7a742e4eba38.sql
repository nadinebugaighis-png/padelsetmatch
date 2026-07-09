
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_coach BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.coach_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  stars INT CHECK (stars IS NULL OR (stars BETWEEN 1 AND 5)),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  UNIQUE (coach_profile_id, student_profile_id),
  CHECK (coach_profile_id <> student_profile_id)
);

CREATE INDEX IF NOT EXISTS coach_endorsements_coach_idx ON public.coach_endorsements(coach_profile_id);
CREATE INDEX IF NOT EXISTS coach_endorsements_student_idx ON public.coach_endorsements(student_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_endorsements TO authenticated;
GRANT ALL ON public.coach_endorsements TO service_role;

ALTER TABLE public.coach_endorsements ENABLE ROW LEVEL SECURITY;

-- Student manages their own endorsement row
CREATE POLICY "Student can insert own endorsement"
  ON public.coach_endorsements FOR INSERT TO authenticated
  WITH CHECK (student_profile_id = public.my_profile_id());

CREATE POLICY "Student can view own endorsement"
  ON public.coach_endorsements FOR SELECT TO authenticated
  USING (student_profile_id = public.my_profile_id() OR coach_profile_id = public.my_profile_id());

CREATE POLICY "Student can update own comment/stars"
  ON public.coach_endorsements FOR UPDATE TO authenticated
  USING (student_profile_id = public.my_profile_id())
  WITH CHECK (student_profile_id = public.my_profile_id());

CREATE POLICY "Coach can update status"
  ON public.coach_endorsements FOR UPDATE TO authenticated
  USING (coach_profile_id = public.my_profile_id())
  WITH CHECK (coach_profile_id = public.my_profile_id());

CREATE POLICY "Student can delete own endorsement"
  ON public.coach_endorsements FOR DELETE TO authenticated
  USING (student_profile_id = public.my_profile_id());

CREATE TRIGGER coach_endorsements_set_updated_at
  BEFORE UPDATE ON public.coach_endorsements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_endorsement_approved_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER coach_endorsements_approved_at
  BEFORE UPDATE ON public.coach_endorsements
  FOR EACH ROW EXECUTE FUNCTION public.set_endorsement_approved_at();

-- Public aggregate stats (anonymous)
CREATE OR REPLACE FUNCTION public.coach_stats(_coach_profile_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'count', COALESCE(count(*), 0),
    'average', COALESCE(round(avg(stars)::numeric, 2), 0),
    'comments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('stars', stars, 'comment', comment, 'approved_at', approved_at) ORDER BY approved_at DESC)
      FROM public.coach_endorsements
      WHERE coach_profile_id = _coach_profile_id
        AND status = 'approved'
        AND comment IS NOT NULL
        AND char_length(trim(comment)) > 0
      LIMIT 50
    ), '[]'::jsonb)
  )
  FROM public.coach_endorsements
  WHERE coach_profile_id = _coach_profile_id
    AND status = 'approved'
    AND stars IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.coach_stats(UUID) TO authenticated, anon;
