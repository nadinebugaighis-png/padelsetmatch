
CREATE OR REPLACE FUNCTION public.open_coach_chat(_coach_profile_id uuid, _acting_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
  v_a uuid;
  v_b uuid;
  v_match_id uuid;
  v_is_coach boolean;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = _acting_user_id LIMIT 1;
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF v_me = _coach_profile_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;

  SELECT is_coach INTO v_is_coach FROM public.profiles WHERE id = _coach_profile_id;
  IF NOT COALESCE(v_is_coach, false) THEN
    RAISE EXCEPTION 'This player is not a coach';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_profile_id = _coach_profile_id AND blocked_profile_id = v_me)
       OR (blocker_profile_id = v_me AND blocked_profile_id = _coach_profile_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message this coach';
  END IF;

  IF v_me < _coach_profile_id THEN
    v_a := v_me; v_b := _coach_profile_id;
  ELSE
    v_a := _coach_profile_id; v_b := v_me;
  END IF;

  INSERT INTO public.matches (profile_a, profile_b, origin)
  VALUES (v_a, v_b, 'coach_inquiry')
  ON CONFLICT (profile_a, profile_b) DO UPDATE SET last_message_at = public.matches.last_message_at
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.open_coach_chat(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_coach_chat(uuid, uuid) TO service_role;
