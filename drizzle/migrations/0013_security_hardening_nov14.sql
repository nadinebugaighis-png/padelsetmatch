-- 1. Server-side capacity, status and gender checks when joining a match
CREATE OR REPLACE FUNCTION public.enforce_match_participant_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev record;
  v_count int;
  v_gender text;
  v_extra int;
  v_has_invite boolean;
BEGIN
  -- Maintenance jobs and server tasks without a signed-in user are trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status::text AS status, coalesce(extra_confirmed, 0) AS extra_confirmed,
         gender_rule::text AS gender_rule, host_profile_id
    INTO ev
    FROM public.match_events
   WHERE id = NEW.match_event_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF ev.status IN ('cancelled', 'played') THEN
    RAISE EXCEPTION 'This match is no longer open';
  END IF;

  -- Already in: let the unique constraint report the duplicate as before.
  IF EXISTS (SELECT 1 FROM public.match_event_participants
              WHERE match_event_id = NEW.match_event_id AND profile_id = NEW.profile_id) THEN
    RETURN NEW;
  END IF;

  SELECT gender::text INTO v_gender FROM public.profiles WHERE id = NEW.profile_id;
  IF ev.gender_rule = 'men_only' AND v_gender IS NOT NULL AND v_gender <> 'man' THEN
    RAISE EXCEPTION 'This match is for men only';
  END IF;
  IF ev.gender_rule = 'women_only' AND v_gender IS NOT NULL AND v_gender <> 'woman' THEN
    RAISE EXCEPTION 'This match is for women only';
  END IF;

  SELECT count(*) INTO v_count FROM public.match_event_participants
   WHERE match_event_id = NEW.match_event_id;
  v_extra := ev.extra_confirmed;

  IF v_count >= 4 THEN
    RAISE EXCEPTION 'This match is full';
  END IF;

  IF v_count + v_extra >= 4 THEN
    -- Invited players and the host may take a spot the host was holding.
    SELECT EXISTS (
      SELECT 1 FROM public.match_event_invites
       WHERE match_event_id = NEW.match_event_id
         AND invitee_profile_id = NEW.profile_id
         AND status::text IN ('pending', 'accepted')
    ) INTO v_has_invite;
    IF v_extra > 0 AND (v_has_invite OR NEW.profile_id = ev.host_profile_id) THEN
      UPDATE public.match_events
         SET extra_confirmed = GREATEST(0, v_extra - 1)
       WHERE id = NEW.match_event_id;
    ELSE
      RAISE EXCEPTION 'This match is full';
    END IF;
  END IF;

  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.enforce_match_participant_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_mep_enforce_rules ON public.match_event_participants;
CREATE TRIGGER trg_mep_enforce_rules
  BEFORE INSERT ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_participant_rules();

-- 2. Signup order: only your own
CREATE OR REPLACE FUNCTION public.get_signup_ordinal(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN _user_id IS DISTINCT FROM auth.uid() THEN NULL ELSE (
    SELECT COUNT(*)::int
      FROM auth.users u
     WHERE u.created_at <= (SELECT created_at FROM auth.users WHERE id = auth.uid())
  ) END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_signup_ordinal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_signup_ordinal(uuid) TO authenticated;

-- 3. Minimal profile lookup: never suspended players, server-only
CREATE OR REPLACE FUNCTION public.get_profiles_minimal(_ids uuid[])
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'first_name', first_name, 'photo_url', photo_url, 'zone', zone
  )), '[]'::jsonb)
  FROM public.profiles WHERE id = ANY(_ids) AND suspended_at IS NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.get_profiles_minimal(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles_minimal(uuid[]) TO service_role;

-- 4. Expired push subscriptions: server-only cleanup
REVOKE EXECUTE ON FUNCTION public.delete_expired_push_subs(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_push_subs(text[]) TO service_role;

-- 5. Old pair Q&A lookup: no other player's answer count
CREATE OR REPLACE FUNCTION public.get_pair_qa(_other uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  RETURN jsonb_build_object(
    'my_count', (SELECT count(*) FROM public.qa_answers WHERE profile_id = v_me),
    'rows', coalesce((SELECT jsonb_agg(jsonb_build_object('profile_id', profile_id, 'question', question, 'answer', answer))
                        FROM (SELECT profile_id, question, answer FROM public.qa_answers
                               WHERE profile_id = v_me LIMIT 200) q), '[]'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.get_pair_qa(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pair_qa(uuid) TO service_role;

-- 6. Verified pair: connected, or played a match together
CREATE OR REPLACE FUNCTION public.is_verified_pair(_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT public.my_profile_id() AS id)
  SELECT coalesce((
    SELECT me.id IS NOT NULL AND me.id <> _other AND (
      EXISTS (SELECT 1 FROM public.matches m
               WHERE m.accepted_at IS NOT NULL
                 AND ((m.profile_a = me.id AND m.profile_b = _other)
                   OR (m.profile_b = me.id AND m.profile_a = _other)))
      OR EXISTS (SELECT 1 FROM public.match_event_participants a
                   JOIN public.match_event_participants b ON b.match_event_id = a.match_event_id
                  WHERE a.profile_id = me.id AND b.profile_id = _other)
    ) FROM me), false);
$$;
REVOKE EXECUTE ON FUNCTION public.is_verified_pair(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_pair(uuid) TO authenticated;