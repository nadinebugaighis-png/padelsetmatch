
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS initiator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill: everything created before this change is considered "accepted"
UPDATE public.matches SET accepted_at = created_at WHERE accepted_at IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS story_hook_en text,
  ADD COLUMN IF NOT EXISTS story_hook_es text,
  ADD COLUMN IF NOT EXISTS story_hook_fr text;

-- ============================================================================
-- open_intro_chat: create a chat + first intro message atomically.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.open_intro_chat(
  _target_profile_id uuid,
  _body text,
  _acting_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_a uuid;
  v_b uuid;
  v_match_id uuid;
  v_existing uuid;
  v_recent int;
  v_suspended timestamptz;
BEGIN
  IF _body IS NULL OR length(btrim(_body)) = 0 OR length(_body) > 140 THEN
    RAISE EXCEPTION 'Intro must be 1-140 characters';
  END IF;

  SELECT id INTO v_me FROM public.profiles WHERE user_id = _acting_user_id LIMIT 1;
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

  IF v_me < _target_profile_id THEN
    v_a := v_me; v_b := _target_profile_id;
  ELSE
    v_a := _target_profile_id; v_b := v_me;
  END IF;

  SELECT id INTO v_existing FROM public.matches
    WHERE profile_a = v_a AND profile_b = v_b LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a thread with this player';
  END IF;

  -- Rate limit: max 5 unreplied intros in the last 24h
  SELECT count(*) INTO v_recent
  FROM public.matches
  WHERE initiator_profile_id = v_me
    AND origin = 'intro'
    AND accepted_at IS NULL
    AND created_at > now() - interval '24 hours';
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
$$;

REVOKE ALL ON FUNCTION public.open_intro_chat(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_intro_chat(uuid, text, uuid) TO authenticated;

-- ============================================================================
-- accept_intro: mark an intro as accepted (called when recipient replies)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_intro(_match_id uuid, _acting_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_match record;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = _acting_user_id LIMIT 1;
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
$$;

REVOKE ALL ON FUNCTION public.accept_intro(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_intro(uuid, uuid) TO authenticated;

-- ============================================================================
-- ignore_intro: recipient discards an intro; delete messages + match.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ignore_intro(_match_id uuid, _acting_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_match record;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = _acting_user_id LIMIT 1;
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
$$;

REVOKE ALL ON FUNCTION public.ignore_intro(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ignore_intro(uuid, uuid) TO authenticated;
