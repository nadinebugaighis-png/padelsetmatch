DROP FUNCTION IF EXISTS public.send_intro_message(uuid, text);

CREATE OR REPLACE FUNCTION public.send_intro_message(_target_profile_id uuid, _body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_a uuid; v_b uuid;
  v_match_id uuid;
  v_existing_mutual boolean;
  v_body text;
BEGIN
  v_me := my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _target_profile_id IS NULL OR _target_profile_id = v_me THEN
    RAISE EXCEPTION 'Invalid target';
  END IF;

  v_body := btrim(coalesce(_body, ''));
  IF length(v_body) = 0 THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;
  IF length(v_body) > 300 THEN RAISE EXCEPTION 'Message too long'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_profile_id = _target_profile_id AND blocked_profile_id = v_me)
       OR (blocker_profile_id = v_me AND blocked_profile_id = _target_profile_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message this user';
  END IF;

  IF v_me < _target_profile_id THEN
    v_a := v_me; v_b := _target_profile_id;
  ELSE
    v_a := _target_profile_id; v_b := v_me;
  END IF;

  -- Silent like from me. If they liked me first, handle_new_like will create a mutual match.
  INSERT INTO public.likes(liker_profile_id, liked_profile_id)
  VALUES (v_me, _target_profile_id)
  ON CONFLICT DO NOTHING;

  v_existing_mutual := EXISTS (
    SELECT 1 FROM public.likes
    WHERE liker_profile_id = _target_profile_id AND liked_profile_id = v_me
  );

  SELECT id INTO v_match_id FROM public.matches WHERE profile_a = v_a AND profile_b = v_b;
  IF v_match_id IS NULL THEN
    INSERT INTO public.matches(profile_a, profile_b, initiator_profile_id, accepted_at, origin)
    VALUES (
      v_a, v_b, v_me,
      CASE WHEN v_existing_mutual THEN now() ELSE NULL END,
      'intro'
    )
    RETURNING id INTO v_match_id;
  ELSE
    -- Match created by handle_new_like above (mutual). Mark accepted + set initiator if empty.
    IF v_existing_mutual THEN
      UPDATE public.matches
      SET accepted_at = COALESCE(accepted_at, now()),
          initiator_profile_id = COALESCE(initiator_profile_id, v_me)
      WHERE id = v_match_id;
    END IF;
  END IF;

  IF NOT v_existing_mutual THEN
    IF EXISTS (
      SELECT 1 FROM public.messages
      WHERE match_id = v_match_id AND sender_profile_id = v_me
    ) THEN
      RAISE EXCEPTION 'INTRO_ALREADY_SENT: You already sent an intro to this player.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.messages(match_id, sender_profile_id, body)
  VALUES (v_match_id, v_me, v_body);

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_intro_message(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_intro_message(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_intro(_match_id uuid, _accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_a uuid; v_b uuid;
  v_initiator uuid;
  v_accepted timestamptz;
  v_other uuid;
BEGIN
  v_me := my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT profile_a, profile_b, initiator_profile_id, accepted_at
  INTO v_a, v_b, v_initiator, v_accepted
  FROM public.matches WHERE id = _match_id;

  IF v_a IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_me <> v_a AND v_me <> v_b THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_initiator IS NULL OR v_initiator = v_me THEN
    RAISE EXCEPTION 'Not an incoming request';
  END IF;
  IF v_accepted IS NOT NULL THEN RAISE EXCEPTION 'Already accepted'; END IF;

  v_other := CASE WHEN v_a = v_me THEN v_b ELSE v_a END;

  IF _accept THEN
    INSERT INTO public.likes(liker_profile_id, liked_profile_id)
    VALUES (v_me, v_other)
    ON CONFLICT DO NOTHING;
    UPDATE public.matches SET accepted_at = now() WHERE id = _match_id;
  ELSE
    DELETE FROM public.matches WHERE id = _match_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_intro(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_intro(uuid, boolean) TO authenticated;