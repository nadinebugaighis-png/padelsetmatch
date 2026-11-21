ALTER TABLE public.competitions ADD COLUMN hosted boolean NOT NULL DEFAULT false;
ALTER TABLE public.competitions ADD COLUMN signup_url text CHECK (signup_url IS NULL OR (signup_url ~ '^https://' AND char_length(signup_url) <= 500));

CREATE OR REPLACE FUNCTION public.guard_competition_hosted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.hosted AND (TG_OP = 'INSERT' OR NOT OLD.hosted)
     AND auth.uid() IS NOT NULL AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only PadelSetMatch can host competitions with sign-up';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER competition_hosted_guard BEFORE INSERT OR UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.guard_competition_hosted();

CREATE OR REPLACE FUNCTION public.enforce_competition_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap int; n int; st timestamptz; h boolean;
BEGIN
  SELECT capacity, starts_at, hosted INTO cap, st, h FROM public.competitions WHERE id = NEW.competition_id FOR UPDATE;
  IF NOT COALESCE(h, false) THEN RAISE EXCEPTION 'Sign up with the organiser for this competition'; END IF;
  IF st < now() - interval '1 day' THEN RAISE EXCEPTION 'This competition has finished'; END IF;
  SELECT count(*) INTO n FROM public.competition_entries WHERE competition_id = NEW.competition_id;
  IF n >= cap THEN RAISE EXCEPTION 'This competition is full'; END IF;
  RETURN NEW;
END $$;

CREATE TABLE public.coach_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  duration_minutes smallint NOT NULL DEFAULT 60 CHECK (duration_minutes IN (60, 90)),
  club_name text NOT NULL CHECK (char_length(club_name) BETWEEN 1 AND 120),
  price_note text CHECK (price_note IS NULL OR char_length(price_note) <= 40),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'requested', 'booked')),
  student_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_note text CHECK (student_note IS NULL OR char_length(student_note) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_profile_id, starts_at)
);
CREATE INDEX coach_slots_starts_idx ON public.coach_slots(starts_at);
CREATE INDEX coach_slots_student_idx ON public.coach_slots(student_profile_id);

GRANT SELECT, INSERT ON public.coach_slots TO authenticated;
GRANT ALL ON public.coach_slots TO service_role;
ALTER TABLE public.coach_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach slots read" ON public.coach_slots FOR SELECT TO authenticated
  USING (status = 'open' OR coach_profile_id = public.my_profile_id() OR student_profile_id = public.my_profile_id());
CREATE POLICY "coach slots add own" ON public.coach_slots FOR INSERT TO authenticated
  WITH CHECK (
    coach_profile_id = public.my_profile_id()
    AND status = 'open' AND student_profile_id IS NULL AND student_note IS NULL
    AND starts_at > now()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.my_profile_id() AND p.is_coach)
  );

CREATE OR REPLACE FUNCTION public.request_coach_slot(_slot uuid, _note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
  IF s.coach_profile_id = v_me THEN RAISE EXCEPTION 'This is your own lesson time'; END IF;
  IF s.status <> 'open' OR s.starts_at <= now() THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
  UPDATE public.coach_slots
    SET status = 'requested', student_profile_id = v_me,
        student_note = NULLIF(left(btrim(COALESCE(_note, '')), 200), ''), updated_at = now()
    WHERE id = _slot;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_request', 'coach_requests',
    COALESCE(v_name, 'A player') || ' asked for a lesson',
    to_char(s.starts_at AT TIME ZONE 'Europe/Madrid', 'Dy DD Mon HH24:MI') || ' · ' || s.club_name,
    '/app/coach');
END $$;

CREATE OR REPLACE FUNCTION public.respond_coach_slot(_slot uuid, _accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text;
BEGIN
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL OR s.coach_profile_id IS DISTINCT FROM v_me THEN RAISE EXCEPTION 'Not your lesson'; END IF;
  IF s.status <> 'requested' OR s.student_profile_id IS NULL THEN RAISE EXCEPTION 'Nothing to answer'; END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  IF _accept THEN
    UPDATE public.coach_slots SET status = 'booked', updated_at = now() WHERE id = _slot;
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_confirmed', 'coach_requests',
      COALESCE(v_name, 'Your coach') || ' confirmed your lesson',
      to_char(s.starts_at AT TIME ZONE 'Europe/Madrid', 'Dy DD Mon HH24:MI') || ' · ' || s.club_name,
      '/app/coaches');
  ELSE
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, updated_at = now() WHERE id = _slot;
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_declined', 'coach_requests',
      COALESCE(v_name, 'The coach') || ' can''t make that time',
      'Pick another time on Book a coach.',
      '/app/coaches');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_coach_slot(_slot uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text;
BEGIN
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Lesson not found'; END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  IF s.coach_profile_id = v_me THEN
    DELETE FROM public.coach_slots WHERE id = _slot;
    IF s.student_profile_id IS NOT NULL AND s.starts_at > now() THEN
      PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_cancelled', 'coach_requests',
        COALESCE(v_name, 'Your coach') || ' cancelled a lesson',
        to_char(s.starts_at AT TIME ZONE 'Europe/Madrid', 'Dy DD Mon HH24:MI') || ' · ' || s.club_name,
        '/app/coaches');
    END IF;
  ELSIF s.student_profile_id = v_me THEN
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, updated_at = now() WHERE id = _slot;
    IF s.starts_at > now() THEN
      PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_cancelled', 'coach_requests',
        COALESCE(v_name, 'A player') || ' cancelled their lesson',
        to_char(s.starts_at AT TIME ZONE 'Europe/Madrid', 'Dy DD Mon HH24:MI') || ' · ' || s.club_name || ' is open again',
        '/app/coach');
    END IF;
  ELSE
    RAISE EXCEPTION 'Not your lesson';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.request_coach_slot(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.respond_coach_slot(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_coach_slot(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_coach_slot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_coach_slot(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_coach_slot(uuid) TO authenticated;