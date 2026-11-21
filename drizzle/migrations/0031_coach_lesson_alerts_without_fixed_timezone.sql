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
    s.club_name,
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
      s.club_name,
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
        s.club_name,
        '/app/coaches');
    END IF;
  ELSIF s.student_profile_id = v_me THEN
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, updated_at = now() WHERE id = _slot;
    IF s.starts_at > now() THEN
      PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_cancelled', 'coach_requests',
        COALESCE(v_name, 'A player') || ' cancelled their lesson',
        s.club_name || ' · the time is open again',
        '/app/coach');
    END IF;
  ELSE
    RAISE EXCEPTION 'Not your lesson';
  END IF;
END $$;