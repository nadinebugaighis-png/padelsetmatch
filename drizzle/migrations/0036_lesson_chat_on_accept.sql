CREATE OR REPLACE FUNCTION public.ensure_lesson_thread(_coach uuid, _student uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a uuid := LEAST(_coach, _student); v_b uuid := GREATEST(_coach, _student); v_id uuid;
BEGIN
  IF _coach IS NULL OR _student IS NULL OR _coach = _student THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.blocks
    WHERE (blocker_profile_id = _coach AND blocked_profile_id = _student)
       OR (blocker_profile_id = _student AND blocked_profile_id = _coach)) THEN RETURN NULL; END IF;
  INSERT INTO public.matches (profile_a, profile_b, origin, initiator_profile_id, accepted_at, last_message_at)
  VALUES (v_a, v_b, 'coach_lesson', NULL, now(), now())
  ON CONFLICT (profile_a, profile_b) DO UPDATE SET accepted_at = COALESCE(public.matches.accepted_at, now())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ensure_lesson_thread(uuid, uuid) FROM PUBLIC, anon, authenticated;

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
    PERFORM public.ensure_lesson_thread(s.coach_profile_id, s.student_profile_id);
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_confirmed', 'coach_requests',
      COALESCE(v_name, 'Your coach') || ' confirmed your lesson',
      CASE WHEN s.student_place = 'travel' THEN 'At your place' ELSE s.club_name END || ' · You can message them in Messages',
      '/app/coaches');
  ELSE
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, student_place = NULL, updated_at = now() WHERE id = _slot;
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_declined', 'coach_requests',
      COALESCE(v_name, 'The coach') || ' can''t make that time',
      'Pick another time on Book a coach.',
      '/app/coaches');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.open_lesson_chat(_slot uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot;
  IF s.id IS NULL OR (s.coach_profile_id IS DISTINCT FROM v_me AND s.student_profile_id IS DISTINCT FROM v_me) THEN
    RAISE EXCEPTION 'Not your lesson';
  END IF;
  IF s.status <> 'booked' THEN RAISE EXCEPTION 'The coach has not confirmed this lesson yet'; END IF;
  v_id := public.ensure_lesson_thread(s.coach_profile_id, s.student_profile_id);
  IF v_id IS NULL THEN RAISE EXCEPTION 'Cannot message this player'; END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.open_lesson_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_lesson_chat(uuid) TO authenticated;