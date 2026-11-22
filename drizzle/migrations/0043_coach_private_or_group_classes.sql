ALTER TABLE public.coach_slots ADD COLUMN offers_group boolean NOT NULL DEFAULT true;
ALTER TABLE public.coach_slots ADD COLUMN group_price_note text CHECK (group_price_note IS NULL OR char_length(group_price_note) <= 40);
ALTER TABLE public.coach_slots ADD COLUMN lesson_kind text CHECK (lesson_kind IS NULL OR lesson_kind IN ('private', 'group'));
ALTER TABLE public.coach_slots ADD COLUMN match_event_id uuid REFERENCES public.match_events(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.coach_slots.price_note IS 'Private lesson price';
COMMENT ON COLUMN public.coach_slots.lesson_kind IS 'What the player asked for: private (1 to 1) or group (open class, up to 4 players); NULL = private (older bookings)';
COMMENT ON COLUMN public.coach_slots.match_event_id IS 'The class on the Matches page created when the coach accepts a group booking';

DROP POLICY IF EXISTS "coach slots add own" ON public.coach_slots;
CREATE POLICY "coach slots add own" ON public.coach_slots FOR INSERT TO authenticated
  WITH CHECK (
    coach_profile_id = public.my_profile_id()
    AND status = 'open' AND student_profile_id IS NULL AND student_note IS NULL AND student_place IS NULL
    AND lesson_kind IS NULL AND match_event_id IS NULL
    AND starts_at > now()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.my_profile_id() AND p.is_coach)
  );

-- Area word used by the Matches feed: last part of a profile's first saved location.
CREATE OR REPLACE FUNCTION public.profile_feed_city(_profile uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT btrim(x) FROM unnest(string_to_array(p.locations[1], '|')) WITH ORDINALITY t(x, i)
          WHERE btrim(x) <> '' ORDER BY i DESC LIMIT 1)
  FROM public.profiles p WHERE p.id = _profile
$$;
REVOKE ALL ON FUNCTION public.profile_feed_city(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.book_coach_slot(_slot uuid, _note text DEFAULT NULL, _place text DEFAULT NULL, _kind text DEFAULT 'private') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text; v_place text; v_note text; v_kind text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;
  v_kind := CASE WHEN _kind = 'group' THEN 'group' ELSE 'private' END;
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
  IF s.coach_profile_id = v_me THEN RAISE EXCEPTION 'This is your own lesson time'; END IF;
  IF s.status <> 'open' OR s.starts_at <= now() THEN RAISE EXCEPTION 'This time is no longer available'; END IF;
  IF v_kind = 'group' AND NOT s.offers_group THEN RAISE EXCEPTION 'This coach only gives private lessons at this time'; END IF;
  v_place := CASE s.lesson_place
    WHEN 'club' THEN 'club'
    WHEN 'travel' THEN 'travel'
    ELSE CASE WHEN _place IN ('club', 'travel') THEN _place END END;
  IF v_place IS NULL THEN RAISE EXCEPTION 'Choose the club or your place'; END IF;
  v_note := NULLIF(left(btrim(COALESCE(_note, '')), 200), '');
  IF v_place = 'travel' AND v_note IS NULL THEN RAISE EXCEPTION 'Tell the coach where to come'; END IF;
  UPDATE public.coach_slots
    SET status = 'requested', student_profile_id = v_me, student_place = v_place, student_note = v_note,
        lesson_kind = v_kind, updated_at = now()
    WHERE id = _slot;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_request', 'coach_requests',
    COALESCE(v_name, 'A player') || CASE WHEN v_kind = 'group' THEN ' asked for a group class' ELSE ' asked for a private lesson' END,
    CASE WHEN v_place = 'travel' THEN 'At their place · ' || s.travel_area ELSE s.club_name END,
    '/app/coach');
END $$;
REVOKE ALL ON FUNCTION public.book_coach_slot(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_coach_slot(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_coach_slot(_slot uuid, _accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.my_profile_id(); s public.coach_slots; v_name text; v_event uuid; v_where text; v_city text;
BEGIN
  SELECT * INTO s FROM public.coach_slots WHERE id = _slot FOR UPDATE;
  IF s.id IS NULL OR s.coach_profile_id IS DISTINCT FROM v_me THEN RAISE EXCEPTION 'Not your lesson'; END IF;
  IF s.status <> 'requested' OR s.student_profile_id IS NULL THEN RAISE EXCEPTION 'Nothing to answer'; END IF;
  SELECT first_name INTO v_name FROM public.profiles WHERE id = v_me;
  IF _accept AND s.lesson_kind = 'group' THEN
    -- The class goes on the Matches page: the coach hosts, the first player is in, 3 places stay open.
    v_where := CASE WHEN s.student_place = 'travel' THEN left(COALESCE(s.student_note, s.travel_area, s.club_name), 120) ELSE s.club_name END;
    v_city := public.profile_feed_city(CASE WHEN s.student_place = 'travel' THEN s.student_profile_id ELSE s.coach_profile_id END);
    INSERT INTO public.match_events (host_profile_id, starts_at, duration_minutes, club_name, city, level_min, level_max,
      gender_rule, extra_confirmed, court_booked, is_private_court, free_court, is_class, class_students, class_fee)
    VALUES (s.coach_profile_id, s.starts_at, s.duration_minutes, v_where, v_city, 'just starting', 'competitive',
      'open', 0, true, s.student_place = 'travel', false, true, 4, s.group_price_note)
    RETURNING id INTO v_event;
    INSERT INTO public.match_event_participants (match_event_id, profile_id) VALUES (v_event, s.student_profile_id)
      ON CONFLICT DO NOTHING;
    -- The coach just accepted: skip the automatic "joined your match" alert to them.
    DELETE FROM public.notifications WHERE profile_id = s.coach_profile_id AND type = 'match_join' AND url = '/app/events/' || v_event::text;
    DELETE FROM public.push_outbox WHERE profile_id = s.coach_profile_id AND type = 'match_join' AND url = '/app/events/' || v_event::text AND sent_at IS NULL;
    UPDATE public.coach_slots SET status = 'booked', match_event_id = v_event, updated_at = now() WHERE id = _slot;
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_confirmed', 'coach_requests',
      COALESCE(v_name, 'Your coach') || ' confirmed your group class',
      'Share it so friends can join · ' || v_where,
      '/app/events/' || v_event::text);
  ELSIF _accept THEN
    UPDATE public.coach_slots SET status = 'booked', updated_at = now() WHERE id = _slot;
    PERFORM public.ensure_lesson_thread(s.coach_profile_id, s.student_profile_id);
    PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_confirmed', 'coach_requests',
      COALESCE(v_name, 'Your coach') || ' confirmed your lesson',
      CASE WHEN s.student_place = 'travel' THEN 'At your place' ELSE s.club_name END || ' · You can message them in Messages',
      '/app/coaches');
  ELSE
    UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, student_place = NULL, lesson_kind = NULL, updated_at = now() WHERE id = _slot;
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
    IF s.match_event_id IS NOT NULL THEN
      -- Cancelling the class tells everyone in it (match cancel alerts).
      UPDATE public.match_events SET status = 'cancelled' WHERE id = s.match_event_id AND status <> 'cancelled';
      DELETE FROM public.coach_slots WHERE id = _slot;
    ELSE
      DELETE FROM public.coach_slots WHERE id = _slot;
      IF s.student_profile_id IS NOT NULL AND s.starts_at > now() THEN
        PERFORM public.enqueue_notification(s.student_profile_id, 'coach_lesson_cancelled', 'coach_requests',
          COALESCE(v_name, 'Your coach') || ' cancelled a lesson',
          CASE WHEN s.student_place = 'travel' THEN 'At your place' ELSE s.club_name END,
          '/app/coaches');
      END IF;
    END IF;
  ELSIF s.student_profile_id = v_me THEN
    IF s.match_event_id IS NOT NULL THEN
      -- A confirmed group class carries on for the others: the player just leaves it.
      DELETE FROM public.match_event_participants WHERE match_event_id = s.match_event_id AND profile_id = v_me;
      UPDATE public.coach_slots SET student_profile_id = NULL, updated_at = now() WHERE id = _slot;
    ELSE
      UPDATE public.coach_slots SET status = 'open', student_profile_id = NULL, student_note = NULL, student_place = NULL, lesson_kind = NULL, updated_at = now() WHERE id = _slot;
      IF s.starts_at > now() THEN
        PERFORM public.enqueue_notification(s.coach_profile_id, 'coach_lesson_cancelled', 'coach_requests',
          COALESCE(v_name, 'A player') || ' cancelled their lesson',
          v_where || ' · the time is open again',
          '/app/coach');
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Not your lesson';
  END IF;
END $$;