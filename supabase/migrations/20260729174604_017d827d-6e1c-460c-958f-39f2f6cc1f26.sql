
-- 1. Stop trusting caller-supplied identity in SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION public.accept_intro(_match_id uuid, _acting_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me uuid; v_match record; v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO v_me FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = _match_id LIMIT 1;
  IF v_match.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_me <> v_match.profile_a AND v_me <> v_match.profile_b THEN
    RAISE EXCEPTION 'Not your match';
  END IF;
  IF v_me = v_match.initiator_profile_id THEN
    RAISE EXCEPTION 'Initiator cannot accept own intro';
  END IF;
  UPDATE public.matches SET accepted_at = now() WHERE id = _match_id AND accepted_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ignore_intro(_match_id uuid, _acting_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me uuid; v_match record; v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO v_me FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = _match_id LIMIT 1;
  IF v_match.id IS NULL THEN RETURN; END IF;
  IF v_me <> v_match.profile_a AND v_me <> v_match.profile_b THEN
    RAISE EXCEPTION 'Not your match';
  END IF;
  IF v_match.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already accepted — use block or delete instead';
  END IF;
  IF v_me = v_match.initiator_profile_id THEN
    RAISE EXCEPTION 'Cannot ignore your own intro';
  END IF;
  DELETE FROM public.messages WHERE match_id = _match_id;
  DELETE FROM public.matches WHERE id = _match_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.open_intro_chat(_target_profile_id uuid, _body text, _acting_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid; v_a uuid; v_b uuid; v_match_id uuid; v_existing uuid;
  v_recent int; v_suspended timestamptz; v_uid uuid;
BEGIN
  IF _body IS NULL OR length(btrim(_body)) = 0 OR length(_body) > 140 THEN
    RAISE EXCEPTION 'Intro must be 1-140 characters';
  END IF;
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO v_me FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF v_me = _target_profile_id THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;

  SELECT suspended_at INTO v_suspended FROM public.profiles WHERE id = _target_profile_id;
  IF v_suspended IS NOT NULL THEN RAISE EXCEPTION 'Cannot message this player'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_profile_id = _target_profile_id AND blocked_profile_id = v_me)
       OR (blocker_profile_id = v_me AND blocked_profile_id = _target_profile_id)
  ) THEN RAISE EXCEPTION 'Cannot message this player'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.hides
    WHERE hider_profile_id = _target_profile_id
      AND hidden_profile_id = v_me
      AND category = 'all'
  ) THEN RAISE EXCEPTION 'Cannot message this player'; END IF;

  IF v_me < _target_profile_id THEN v_a := v_me; v_b := _target_profile_id;
  ELSE v_a := _target_profile_id; v_b := v_me; END IF;

  SELECT id INTO v_existing FROM public.matches WHERE profile_a = v_a AND profile_b = v_b LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a thread with this player';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.matches
  WHERE initiator_profile_id = v_me AND origin = 'intro'
    AND accepted_at IS NULL AND created_at > now() - interval '24 hours';
  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'Intro limit reached — 5 per day. Try again tomorrow.';
  END IF;

  INSERT INTO public.matches (profile_a, profile_b, origin, initiator_profile_id, last_message_at)
  VALUES (v_a, v_b, 'intro', v_me, now())
  RETURNING id INTO v_match_id;

  INSERT INTO public.messages (match_id, sender_profile_id, body)
  VALUES (v_match_id, v_me, btrim(_body));

  RETURN v_match_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.open_coach_chat(_coach_profile_id uuid, _acting_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me uuid; v_a uuid; v_b uuid; v_match_id uuid; v_is_coach boolean; v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO v_me FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF v_me = _coach_profile_id THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;

  SELECT is_coach INTO v_is_coach FROM public.profiles WHERE id = _coach_profile_id;
  IF NOT COALESCE(v_is_coach, false) THEN RAISE EXCEPTION 'This player is not a coach'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_profile_id = _coach_profile_id AND blocked_profile_id = v_me)
       OR (blocker_profile_id = v_me AND blocked_profile_id = _coach_profile_id)
  ) THEN RAISE EXCEPTION 'Cannot message this coach'; END IF;

  IF v_me < _coach_profile_id THEN v_a := v_me; v_b := _coach_profile_id;
  ELSE v_a := _coach_profile_id; v_b := v_me; END IF;

  INSERT INTO public.matches (profile_a, profile_b, origin)
  VALUES (v_a, v_b, 'coach_inquiry')
  ON CONFLICT (profile_a, profile_b) DO UPDATE SET last_message_at = public.matches.last_message_at
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$function$;

-- 2. Compatibility scoring can only be computed for the caller's own profile.
CREATE OR REPLACE FUNCTION public.qa_affinity_scores(_me_id uuid, _ids uuid[])
RETURNS TABLE(profile_id uuid, qa_bonus integer, q_same integer, q_close integer, q_shared integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT public.my_profile_id() AS id
  ),
  mine AS (
    SELECT q.question, q.answer_norm, q.answer_embedding
    FROM public.qa_answers q, me
    WHERE q.profile_id = me.id AND me.id = _me_id
  ),
  theirs AS (
    SELECT q.profile_id, q.question, q.answer_norm, q.answer_embedding
    FROM public.qa_answers q, me
    WHERE q.profile_id = ANY(_ids) AND q.profile_id <> me.id AND me.id = _me_id
  ),
  paired AS (
    SELECT
      t.profile_id,
      t.question,
      (t.answer_norm = m.answer_norm) AS same_norm,
      CASE
        WHEN m.answer_embedding IS NOT NULL AND t.answer_embedding IS NOT NULL
        THEN 1 - (m.answer_embedding <=> t.answer_embedding)
        ELSE NULL
      END AS sim
    FROM theirs t
    JOIN mine m USING (question)
  )
  SELECT
    p.profile_id,
    LEAST(30, SUM(
      CASE
        WHEN p.same_norm THEN 5
        WHEN p.sim >= 0.85 THEN 4
        WHEN p.sim >= 0.70 THEN 3
        WHEN p.sim >= 0.55 THEN 2
        ELSE 1
      END
    ))::int AS qa_bonus,
    COUNT(*) FILTER (WHERE p.same_norm)::int AS q_same,
    COUNT(*) FILTER (WHERE NOT p.same_norm AND p.sim >= 0.70)::int AS q_close,
    COUNT(*)::int AS q_shared
  FROM paired p
  GROUP BY p.profile_id;
$function$;

-- 3. Guest list writes only through the guest join flow (SECURITY DEFINER RPCs).
REVOKE INSERT, UPDATE ON public.guest_participants FROM anon, authenticated;

-- 4. Email throttling config stays internal only.
REVOKE ALL ON public.email_send_state FROM anon, authenticated;
GRANT ALL ON public.email_send_state TO service_role;
