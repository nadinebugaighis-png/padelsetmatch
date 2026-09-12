-- 1. Phone number alone must never hand out a guest session token.
CREATE OR REPLACE FUNCTION public.guest_recover_token(_event_id uuid, _phone text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Phone-only session recovery removed: a phone number is not proof of ownership.
  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.guest_recover_token(uuid, text) FROM anon, authenticated;

-- 2. Joining with an already-registered phone must not return the existing guest's token.
CREATE OR REPLACE FUNCTION public.guest_join_match(_event_id uuid, _display_name text, _level text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event RECORD; v_p int; v_g int; v_slots int; v_guest_id uuid; v_token uuid; v_existing RECORD;
  v_guest_rank int; v_min_rank int; v_max_rank int;
BEGIN
  IF _display_name IS NULL OR length(trim(_display_name)) < 1 THEN
    RAISE EXCEPTION 'Please enter your name';
  END IF;
  IF _phone IS NULL OR length(trim(_phone)) < 4 THEN
    RAISE EXCEPTION 'Please enter a phone number';
  END IF;
  IF _level = 'beginner' THEN _level := 'just starting'; END IF;
  IF _level IS NULL OR _level NOT IN ('just starting','casual','intermediate','advanced','competitive') THEN
    RAISE EXCEPTION 'Please choose your padel level';
  END IF;

  SELECT * INTO v_event FROM public.match_events WHERE id = _event_id;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'This match was cancelled'; END IF;
  IF v_event.status = 'played' THEN RAISE EXCEPTION 'This match already happened'; END IF;
  IF v_event.starts_at <= now() THEN RAISE EXCEPTION 'This match has already started'; END IF;
  IF v_event.invite_lock_until IS NOT NULL AND now() < v_event.invite_lock_until THEN
    RAISE EXCEPTION 'INVITE_LOCK:%', v_event.invite_lock_until;
  END IF;

  v_guest_rank := public.padel_level_rank(_level);
  v_min_rank := public.padel_level_rank(v_event.level_min);
  v_max_rank := public.padel_level_rank(v_event.level_max);
  IF v_min_rank IS NOT NULL AND v_max_rank IS NOT NULL AND v_guest_rank IS NOT NULL THEN
    IF v_guest_rank < v_min_rank OR v_guest_rank > v_max_rank THEN
      RAISE EXCEPTION 'LEVEL_MISMATCH:%:%:%', v_event.level_min, v_event.level_max, _level;
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.guest_participants
    WHERE match_event_id = _event_id AND phone = trim(_phone);
  IF v_existing.id IS NOT NULL THEN
    -- Do NOT return the existing session token: phone alone is not proof of ownership.
    RAISE EXCEPTION 'ALREADY_JOINED';
  END IF;

  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = _event_id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = _event_id;
  v_slots := 4 - (v_p + v_g + COALESCE(v_event.extra_confirmed, 0));
  IF v_slots <= 0 THEN RAISE EXCEPTION 'This match is already full'; END IF;

  INSERT INTO public.guest_participants (match_event_id, display_name, level, phone)
  VALUES (_event_id, trim(_display_name), _level, trim(_phone))
  RETURNING id, session_token INTO v_guest_id, v_token;
  RETURN jsonb_build_object('guest_id', v_guest_id, 'token', v_token);
END
$function$;

-- 3. Pair Q&A may only expose the other profile's raw answers once a match exists,
--    mirroring the qa_answers row-level policy.
CREATE OR REPLACE FUNCTION public.get_pair_qa(_other uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
  v_matched boolean;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.profile_a = v_me AND m.profile_b = _other)
       OR (m.profile_b = v_me AND m.profile_a = _other)
  ) INTO v_matched;

  RETURN jsonb_build_object(
    'my_count', (SELECT count(*) FROM public.qa_answers WHERE profile_id = v_me),
    'their_count', (SELECT count(*) FROM public.qa_answers WHERE profile_id = _other),
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('profile_id', profile_id, 'question', question, 'answer', answer))
      FROM (
        SELECT profile_id, question, answer
        FROM public.qa_answers
        WHERE profile_id = v_me
           OR (v_matched AND profile_id = _other)
        LIMIT 200
      ) t
    ), '[]'::jsonb)
  );
END
$function$;