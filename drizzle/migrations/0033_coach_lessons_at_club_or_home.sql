ALTER TABLE public.coach_slots ADD COLUMN lesson_place text NOT NULL DEFAULT 'club' CHECK (lesson_place IN ('club', 'travel', 'both'));
ALTER TABLE public.coach_slots ADD COLUMN travel_area text CHECK (travel_area IS NULL OR char_length(travel_area) BETWEEN 1 AND 120);
ALTER TABLE public.coach_slots ADD COLUMN student_place text CHECK (student_place IS NULL OR student_place IN ('club', 'travel'));
ALTER TABLE public.coach_slots ADD CONSTRAINT coach_slots_travel_area_needed CHECK (lesson_place = 'club' OR travel_area IS NOT NULL);
COMMENT ON COLUMN public.coach_slots.club_name IS 'Club name; for travel-only lessons it repeats travel_area so alerts always have a place';
COMMENT ON COLUMN public.coach_slots.lesson_place IS 'club = at the club, travel = coach comes to the player, both = player chooses';

DROP POLICY IF EXISTS "coach slots add own" ON public.coach_slots;
CREATE POLICY "coach slots add own" ON public.coach_slots FOR INSERT TO authenticated
  WITH CHECK (
    coach_profile_id = public.my_profile_id()
    AND status = 'open' AND student_profile_id IS NULL AND student_note IS NULL AND student_place IS NULL
    AND starts_at > now()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.my_profile_id() AND p.is_coach)
  );

DROP FUNCTION IF EXISTS public.request_coach_slot(uuid, text);
CREATE FUNCTION public.request_coach_slot(_slot uuid, _note text DEFAULT NULL, _place text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text; v_place text; v_note text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
  IF s.coach_profile_id = v_me THEN RAISE EXCEPTION 'This is your own lesson time'; END IF;
  IF s.status <> 'open' OR s.starts_at <= now() THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
  v_place := CASE s.lesson_place
    WHEN 'club' THEN 'club'
    WHEN 'travel' THEN 'travel'
    ELSE CASE WHEN _place IN ('club', 'travel') THEN _place END END;
  IF v_place IS NULL THEN RAISE EXCEPTION 'Choose the club or your place'; END IF;
  v_note := NULLIF(left(btrim(COALESCE(_note, '')), 200), '');
  IF v_place = 'travel' AND v_note IS NULL THEN RAISE EXCEPTION 'Tell the coach where to come'; END IF;
  UPDATE public.coach_slots
    SET status = 'requested', student_profile_id = v_me, student_place = v_place, student_note = v_note, updated_at = now()
    WHERE id = _slot;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_request', 'coach_requests',
    COALESCE(v_name, 'A player') || ' asked for a lesson',
    CASE WHEN v_place = 'travel' THEN 'At their place · ' || s.travel_area ELSE s.club_name END,
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
      CASE WHEN s.student_place = 'travel' THEN 'At your place' ELSE s.club_name END,
      '/app/coaches');
  ELSE
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, student_place = NULL, updated_at = now() WHERE id = _slot;
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_declined', 'coach_requests',
      COALESCE(v_name, 'The coach') || ' can''t make that time',
      'Pick another time on Book a coach.',
      '/app/coaches');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_coach_slot(_slot uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text; v_where text;
BEGIN
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Lesson not found'; END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  v_where := CASE WHEN s.student_place = 'travel' THEN 'At the player''s place' ELSE s.club_name END;
  IF s.coach_profile_id = v_me THEN
    DELETE FROM public.coach_slots WHERE id = _slot;
    IF s.student_profile_id IS NOT NULL AND s.starts_at > now() THEN
      PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_cancelled', 'coach_requests',
        COALESCE(v_name, 'Your coach') || ' cancelled a lesson',
        CASE WHEN s.student_place = 'travel' THEN 'At your place' ELSE s.club_name END,
        '/app/coaches');
    END IF;
  ELSIF s.student_profile_id = v_me THEN
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, student_place = NULL, updated_at = now() WHERE id = _slot;
    IF s.starts_at > now() THEN
      PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_cancelled', 'coach_requests',
        COALESCE(v_name, 'A player') || ' cancelled their lesson',
        v_where || ' · the time is open again',
        '/app/coach');
    END IF;
  ELSE
    RAISE EXCEPTION 'Not your lesson';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.request_coach_slot(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_coach_slot(uuid, text, text) TO authenticated;