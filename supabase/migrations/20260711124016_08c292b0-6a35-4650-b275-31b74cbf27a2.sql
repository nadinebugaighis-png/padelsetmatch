
-- Enforce single intro message rule at DB level
CREATE OR REPLACE FUNCTION public.enforce_single_intro_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a uuid; v_b uuid; v_other uuid;
  v_mutual boolean;
  v_my_sent int; v_other_sent int;
BEGIN
  SELECT profile_a, profile_b INTO v_a, v_b FROM public.matches WHERE id = NEW.match_id;
  IF v_a IS NULL THEN RETURN NEW; END IF;
  v_other := CASE WHEN v_a = NEW.sender_profile_id THEN v_b ELSE v_a END;

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
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_intro_message ON public.messages;
CREATE TRIGGER trg_enforce_single_intro_message
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_intro_message();

-- RPC to send an intro message (creates match row on demand)
CREATE OR REPLACE FUNCTION public.send_intro_message(other_profile_id uuid, message_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_id uuid := my_profile_id();
  v_a uuid; v_b uuid; v_match_id uuid;
BEGIN
  IF my_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF other_profile_id IS NULL OR other_profile_id = my_id THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;
  IF coalesce(length(btrim(message_body)), 0) = 0 THEN
    RAISE EXCEPTION 'Empty message';
  END IF;

  IF my_id < other_profile_id THEN
    v_a := my_id; v_b := other_profile_id;
  ELSE
    v_a := other_profile_id; v_b := my_id;
  END IF;

  INSERT INTO public.matches(profile_a, profile_b) VALUES (v_a, v_b) ON CONFLICT DO NOTHING;
  SELECT id INTO v_match_id FROM public.matches WHERE profile_a = v_a AND profile_b = v_b;

  INSERT INTO public.messages(match_id, sender_profile_id, body)
  VALUES (v_match_id, my_id, btrim(message_body));

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_intro_message(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_intro_message(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_intro_message(uuid, text) TO authenticated;
