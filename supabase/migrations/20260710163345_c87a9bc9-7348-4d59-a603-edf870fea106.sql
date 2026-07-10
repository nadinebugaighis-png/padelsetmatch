
-- 1. guest_participants table
CREATE TABLE public.guest_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_event_id uuid NOT NULL REFERENCES public.match_events(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
  level text NOT NULL,
  phone text NOT NULL CHECK (length(phone) BETWEEN 4 AND 32),
  session_token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX guest_participants_event_phone_key ON public.guest_participants (match_event_id, phone);
CREATE INDEX guest_participants_event_idx ON public.guest_participants(match_event_id);
CREATE INDEX guest_participants_token_idx ON public.guest_participants(session_token);
GRANT SELECT ON public.guest_participants TO authenticated;
GRANT ALL ON public.guest_participants TO service_role;
ALTER TABLE public.guest_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event participants can view guests" ON public.guest_participants
FOR SELECT TO authenticated
USING (
  EXISTS(SELECT 1 FROM public.match_event_participants p
         WHERE p.match_event_id = guest_participants.match_event_id
         AND p.profile_id = public.my_profile_id())
  OR EXISTS(SELECT 1 FROM public.match_events me
            WHERE me.id = guest_participants.match_event_id
            AND me.host_profile_id = public.my_profile_id())
);
CREATE POLICY "Host can remove guests" ON public.guest_participants
FOR DELETE TO authenticated
USING (
  EXISTS(SELECT 1 FROM public.match_events me
         WHERE me.id = guest_participants.match_event_id
         AND me.host_profile_id = public.my_profile_id())
);

-- 2. match_event_messages: allow guest senders
ALTER TABLE public.match_event_messages
  ADD COLUMN guest_id uuid REFERENCES public.guest_participants(id) ON DELETE CASCADE;
ALTER TABLE public.match_event_messages
  ALTER COLUMN sender_profile_id DROP NOT NULL;
ALTER TABLE public.match_event_messages
  ADD CONSTRAINT mem_one_sender_ck
  CHECK ((sender_profile_id IS NOT NULL AND guest_id IS NULL)
      OR (sender_profile_id IS NULL AND guest_id IS NOT NULL));

-- 3. Founding 100 badge
ALTER TABLE public.profiles ADD COLUMN founding_number integer UNIQUE;
CREATE INDEX profiles_founding_number_idx ON public.profiles(founding_number) WHERE founding_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_founding_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.founding_number IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.is_seed THEN RETURN NEW; END IF;
  IF NEW.onboarding_stage IS DISTINCT FROM 'complete' THEN RETURN NEW; END IF;
  IF NEW.photo_url IS NULL THEN RETURN NEW; END IF;
  IF NEW.first_name IS NULL OR trim(NEW.first_name) = '' THEN RETURN NEW; END IF;
  IF NEW.level IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(MAX(founding_number), 0) + 1 INTO next_num FROM public.profiles;
  NEW.founding_number = next_num;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_assign_founding_number
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_founding_number();

-- Backfill existing complete profiles
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.profiles
  WHERE NOT is_seed AND onboarding_stage = 'complete'
    AND photo_url IS NOT NULL AND first_name IS NOT NULL AND level IS NOT NULL
    AND founding_number IS NULL
)
UPDATE public.profiles p SET founding_number = ranked.rn FROM ranked WHERE p.id = ranked.id;

-- 4. Update public_match_view to include guests
CREATE OR REPLACE FUNCTION public.public_match_view(_event_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', me.id,
    'starts_at', me.starts_at,
    'club_name', me.club_name,
    'club_address', me.club_address,
    'city', me.city, 'country', me.country,
    'gender_rule', me.gender_rule,
    'level_min', me.level_min, 'level_max', me.level_max,
    'note', me.note, 'court_booked', me.court_booked, 'status', me.status,
    'extra_confirmed', me.extra_confirmed,
    'filled', COALESCE((SELECT count(*) FROM public.match_event_participants p WHERE p.match_event_id = me.id), 0)
            + COALESCE((SELECT count(*) FROM public.guest_participants g WHERE g.match_event_id = me.id), 0)
            + COALESCE(me.extra_confirmed, 0),
    'host', (SELECT jsonb_build_object('first_name', pr.first_name) FROM public.profiles pr WHERE pr.id = me.host_profile_id),
    'participant_names', COALESCE((
      SELECT jsonb_agg(name ORDER BY joined_at) FROM (
        SELECT pr.first_name AS name, p.joined_at
        FROM public.match_event_participants p
        JOIN public.profiles pr ON pr.id = p.profile_id
        WHERE p.match_event_id = me.id
        UNION ALL
        SELECT g.display_name || ' (guest)' AS name, g.created_at AS joined_at
        FROM public.guest_participants g
        WHERE g.match_event_id = me.id
      ) x
    ), '[]'::jsonb)
  )
  FROM public.match_events me
  WHERE me.id = _event_id
    AND me.status IN ('open', 'full')
    AND me.starts_at > now() - interval '2 hours';
$$;

-- 5. Update check_match_event_full to consider guests
CREATE OR REPLACE FUNCTION public.check_match_event_full()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_id uuid;
  v_p int; v_g int; v_extra int;
BEGIN
  v_event_id := COALESCE(NEW.match_event_id, OLD.match_event_id);
  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = v_event_id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = v_event_id;
  SELECT extra_confirmed INTO v_extra FROM public.match_events WHERE id = v_event_id;
  IF (v_p + v_g + COALESCE(v_extra, 0)) >= 4 THEN
    UPDATE public.match_events SET status = 'full' WHERE id = v_event_id AND status = 'open';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_guest_check_full
  AFTER INSERT OR DELETE ON public.guest_participants
  FOR EACH ROW EXECUTE FUNCTION public.check_match_event_full();

-- 6. Guest RPCs (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.guest_join_match(
  _event_id uuid, _display_name text, _level text, _phone text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event RECORD; v_p int; v_g int; v_slots int; v_guest_id uuid; v_token uuid; v_existing RECORD;
BEGIN
  IF _display_name IS NULL OR length(trim(_display_name)) < 1 THEN
    RAISE EXCEPTION 'Please enter your name';
  END IF;
  IF _phone IS NULL OR length(trim(_phone)) < 4 THEN
    RAISE EXCEPTION 'Please enter a phone number';
  END IF;
  IF _level IS NULL OR _level NOT IN ('casual','beginner','intermediate','advanced','competitive') THEN
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

  SELECT * INTO v_existing FROM public.guest_participants
    WHERE match_event_id = _event_id AND phone = trim(_phone);
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('guest_id', v_existing.id, 'token', v_existing.session_token);
  END IF;

  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = _event_id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = _event_id;
  v_slots := 4 - (v_p + v_g + COALESCE(v_event.extra_confirmed, 0));
  IF v_slots <= 0 THEN RAISE EXCEPTION 'This match is already full'; END IF;

  INSERT INTO public.guest_participants (match_event_id, display_name, level, phone)
  VALUES (_event_id, trim(_display_name), _level, trim(_phone))
  RETURNING id, session_token INTO v_guest_id, v_token;
  RETURN jsonb_build_object('guest_id', v_guest_id, 'token', v_token);
END $$;
REVOKE ALL ON FUNCTION public.guest_join_match(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_join_match(uuid, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_leave_match(_event_id uuid, _token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.guest_participants WHERE match_event_id = _event_id AND session_token = _token;
END $$;
REVOKE ALL ON FUNCTION public.guest_leave_match(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_leave_match(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_send_message(_event_id uuid, _token uuid, _body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest_id uuid; v_id uuid;
BEGIN
  IF _body IS NULL OR length(trim(_body)) < 1 THEN
    RAISE EXCEPTION 'Message is empty';
  END IF;
  IF length(_body) > 2000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;
  SELECT id INTO v_guest_id FROM public.guest_participants
    WHERE match_event_id = _event_id AND session_token = _token;
  IF v_guest_id IS NULL THEN
    RAISE EXCEPTION 'Not a guest of this match';
  END IF;
  INSERT INTO public.match_event_messages (match_event_id, sender_profile_id, guest_id, body)
  VALUES (_event_id, NULL, v_guest_id, _body)
  RETURNING id INTO v_id;
  UPDATE public.match_events SET updated_at = now() WHERE id = _event_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.guest_send_message(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_send_message(uuid, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_get_room(_event_id uuid, _token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest RECORD; v_view jsonb; v_messages jsonb;
BEGIN
  SELECT * INTO v_guest FROM public.guest_participants
    WHERE match_event_id = _event_id AND session_token = _token;
  IF v_guest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  v_view := public.public_match_view(_event_id);
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'created_at'), '[]'::jsonb) INTO v_messages
  FROM (
    SELECT jsonb_build_object(
      'id', m.id, 'body', m.body, 'created_at', m.created_at,
      'sender_name', COALESCE(pr.first_name, g.display_name, 'Guest'),
      'is_guest', m.guest_id IS NOT NULL,
      'is_me', (m.guest_id = v_guest.id)
    ) AS row
    FROM public.match_event_messages m
    LEFT JOIN public.profiles pr ON pr.id = m.sender_profile_id
    LEFT JOIN public.guest_participants g ON g.id = m.guest_id
    WHERE m.match_event_id = _event_id
    ORDER BY m.created_at DESC
    LIMIT 200
  ) sub;
  RETURN jsonb_build_object('ok', true, 'match', v_view, 'messages', v_messages,
    'guest', jsonb_build_object('id', v_guest.id, 'display_name', v_guest.display_name));
END $$;
REVOKE ALL ON FUNCTION public.guest_get_room(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_get_room(uuid, uuid) TO anon, authenticated;

-- 7. Public upcoming matches for guest Play feed
CREATE OR REPLACE FUNCTION public.list_public_upcoming_matches(_limit int DEFAULT 40)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'starts_at'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', me.id, 'starts_at', me.starts_at, 'club_name', me.club_name,
      'city', me.city, 'club_address', me.club_address,
      'level_min', me.level_min, 'level_max', me.level_max, 'gender_rule', me.gender_rule,
      'filled', COALESCE((SELECT count(*) FROM public.match_event_participants p WHERE p.match_event_id = me.id), 0)
              + COALESCE((SELECT count(*) FROM public.guest_participants g WHERE g.match_event_id = me.id), 0)
              + COALESCE(me.extra_confirmed, 0),
      'host_name', (SELECT first_name FROM public.profiles WHERE id = me.host_profile_id)
    ) AS row
    FROM public.match_events me
    WHERE me.status = 'open'
      AND me.starts_at > now()
      AND me.starts_at < now() + interval '30 days'
    ORDER BY me.starts_at ASC
    LIMIT GREATEST(1, LEAST(_limit, 100))
  ) sub;
$$;
REVOKE ALL ON FUNCTION public.list_public_upcoming_matches(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_upcoming_matches(int) TO anon, authenticated;
