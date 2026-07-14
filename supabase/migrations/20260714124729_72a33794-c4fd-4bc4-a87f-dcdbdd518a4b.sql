
-- send_intro_message: creates a pending match (accepted_at NULL) + inserts one message.
CREATE OR REPLACE FUNCTION public.send_intro_message(_target_profile_id uuid, _body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid;
  _a uuid;
  _b uuid;
  _match_id uuid;
  _existing record;
BEGIN
  SELECT id INTO _me FROM public.profiles WHERE user_id = auth.uid();
  IF _me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;
  IF _me = _target_profile_id THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN RAISE EXCEPTION 'Empty message'; END IF;

  _a := LEAST(_me, _target_profile_id);
  _b := GREATEST(_me, _target_profile_id);

  -- Block/hide checks
  IF EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_profile_id = _target_profile_id AND blocked_profile_id = _me)
                                            OR (blocker_profile_id = _me AND blocked_profile_id = _target_profile_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT id, accepted_at, initiator_profile_id INTO _existing
  FROM public.matches WHERE profile_a = _a AND profile_b = _b;

  IF FOUND THEN
    -- Already matched or intro pending — surface as existing thread.
    _match_id := _existing.id;
    IF _existing.accepted_at IS NOT NULL THEN
      -- Fully matched: just send as a normal message.
      INSERT INTO public.messages (match_id, sender_profile_id, body)
      VALUES (_match_id, _me, _body);
      RETURN _match_id;
    END IF;
    -- Pending exists — do not allow spamming a second intro.
    IF _existing.initiator_profile_id = _me THEN
      RAISE EXCEPTION 'You already sent a message request';
    ELSE
      RAISE EXCEPTION 'They already sent you a request — respond to it first';
    END IF;
  END IF;

  INSERT INTO public.matches (profile_a, profile_b, initiator_profile_id, accepted_at, last_message_at)
  VALUES (_a, _b, _me, NULL, now())
  RETURNING id INTO _match_id;

  INSERT INTO public.messages (match_id, sender_profile_id, body)
  VALUES (_match_id, _me, _body);

  RETURN _match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_intro_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_intro_message(uuid, text) TO authenticated;

-- respond_to_intro: recipient accepts (accepted_at = now) or ignores (delete match + message).
CREATE OR REPLACE FUNCTION public.respond_to_intro(_match_id uuid, _accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid;
  _match record;
BEGIN
  SELECT id INTO _me FROM public.profiles WHERE user_id = auth.uid();
  IF _me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;

  SELECT * INTO _match FROM public.matches WHERE id = _match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _match.accepted_at IS NOT NULL THEN RETURN; END IF;
  IF _match.initiator_profile_id IS NULL THEN RAISE EXCEPTION 'Not a request'; END IF;
  IF _match.initiator_profile_id = _me THEN RAISE EXCEPTION 'Only the recipient can respond'; END IF;
  IF _me <> _match.profile_a AND _me <> _match.profile_b THEN RAISE EXCEPTION 'Not your request'; END IF;

  IF _accept THEN
    UPDATE public.matches SET accepted_at = now() WHERE id = _match_id;
  ELSE
    DELETE FROM public.messages WHERE match_id = _match_id;
    DELETE FROM public.matches WHERE id = _match_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_intro(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_intro(uuid, boolean) TO authenticated;
