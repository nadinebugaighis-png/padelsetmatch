CREATE OR REPLACE FUNCTION public.enforce_single_intro_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_a uuid; v_b uuid; v_other uuid; v_origin text;
  v_mutual boolean;
  v_my_sent int; v_other_sent int;
BEGIN
  SELECT profile_a, profile_b, origin INTO v_a, v_b, v_origin FROM public.matches WHERE id = NEW.match_id;
  IF v_a IS NULL THEN RETURN NEW; END IF;
  v_other := CASE WHEN v_a = NEW.sender_profile_id THEN v_b ELSE v_a END;

  -- Coach and player of a confirmed lesson talk freely.
  IF v_origin = 'coach_lesson' OR EXISTS (
    SELECT 1 FROM public.coach_slots cs
    WHERE cs.status = 'booked'
      AND ((cs.coach_profile_id = NEW.sender_profile_id AND cs.student_profile_id = v_other)
        OR (cs.coach_profile_id = v_other AND cs.student_profile_id = NEW.sender_profile_id))
  ) THEN RETURN NEW; END IF;

  v_mutual :=
    EXISTS (SELECT 1 FROM public.likes WHERE liker_profile_id = NEW.sender_profile_id AND liked_profile_id = v_other)
    AND
    EXISTS (SELECT 1 FROM public.likes WHERE liker_profile_id = v_other AND liked_profile_id = NEW.sender_profile_id);

  IF v_mutual THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_my_sent FROM public.messages
    WHERE match_id = NEW.match_id AND sender_profile_id = NEW.sender_profile_id;
  SELECT count(*) INTO v_other_sent FROM public.messages
    WHERE match_id = NEW.match_id AND sender_profile_id = v_other;

  IF v_my_sent >= 1 AND v_other_sent = 0 THEN
    RAISE EXCEPTION 'INTRO_LIMIT: You can only send one intro message. Wait for a reply or connect first.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;