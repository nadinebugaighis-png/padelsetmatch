-- Classes: a host can mark a game as a class (coach + 1–3 students) with an optional fee note.
ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS is_class boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS class_students smallint,
  ADD COLUMN IF NOT EXISTS class_fee text;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_class_students_range CHECK (class_students IS NULL OR class_students BETWEEN 1 AND 3),
  ADD CONSTRAINT match_events_class_fee_length CHECK (class_fee IS NULL OR char_length(class_fee) <= 40);

-- Seats in a game: 4 for a match, coach + students for a class.
CREATE OR REPLACE FUNCTION public.match_event_capacity(_is_class boolean, _class_students smallint)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN coalesce(_is_class, false) THEN 1 + coalesce(_class_students, 3) ELSE 4 END
$$;
GRANT EXECUTE ON FUNCTION public.match_event_capacity(boolean, smallint) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_match_event_full()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
  v_p int; v_g int; v_extra int; v_total int; v_cap int;
BEGIN
  v_event_id := COALESCE(NEW.match_event_id, OLD.match_event_id);
  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = v_event_id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = v_event_id;
  SELECT extra_confirmed, public.match_event_capacity(is_class, class_students)
    INTO v_extra, v_cap FROM public.match_events WHERE id = v_event_id;
  v_total := v_p + v_g + COALESCE(v_extra, 0);
  IF v_total >= COALESCE(v_cap, 4) THEN
    UPDATE public.match_events SET status = 'full' WHERE id = v_event_id AND status = 'open';
  ELSE
    UPDATE public.match_events SET status = 'open' WHERE id = v_event_id AND status = 'full';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $function$;

CREATE OR REPLACE FUNCTION public.sync_match_event_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_p int; v_g int; v_total int;
BEGIN
  IF NEW.status NOT IN ('open','full') THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = NEW.id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = NEW.id;
  v_total := v_p + v_g + COALESCE(NEW.extra_confirmed, 0);
  NEW.status := CASE WHEN v_total >= public.match_event_capacity(NEW.is_class, NEW.class_students)
                     THEN 'full'::public.match_event_status ELSE 'open'::public.match_event_status END;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.enforce_match_participant_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev record;
  v_count int;
  v_gender text;
  v_extra int;
  v_cap int;
  v_has_invite boolean;
BEGIN
  -- Maintenance jobs and server tasks without a signed-in user are trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status::text AS status, coalesce(extra_confirmed, 0) AS extra_confirmed,
         gender_rule::text AS gender_rule, host_profile_id,
         public.match_event_capacity(is_class, class_students) AS capacity
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
  v_cap := ev.capacity;

  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'This match is full';
  END IF;

  IF v_count + v_extra >= v_cap THEN
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
END $function$;

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
  v_slots := public.match_event_capacity(v_event.is_class, v_event.class_students)
             - (v_p + v_g + COALESCE(v_event.extra_confirmed, 0));
  IF v_slots <= 0 THEN RAISE EXCEPTION 'This match is already full'; END IF;

  INSERT INTO public.guest_participants (match_event_id, display_name, level, phone)
  VALUES (_event_id, trim(_display_name), _level, trim(_phone))
  RETURNING id, session_token INTO v_guest_id, v_token;
  RETURN jsonb_build_object('guest_id', v_guest_id, 'token', v_token);
END
$function$;

CREATE OR REPLACE FUNCTION public.notify_favorite_match_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_host_name TEXT;
  v_slots INT;
BEGIN
  IF current_setting('app.house_games', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.starts_at <= now() THEN RETURN NEW; END IF;
  v_slots := public.match_event_capacity(NEW.is_class, NEW.class_students) - (1 + COALESCE(NEW.extra_confirmed, 0));
  IF v_slots <= 0 THEN RETURN NEW; END IF;
  SELECT first_name INTO v_host_name FROM public.profiles WHERE id = NEW.host_profile_id;
  FOR r IN
    SELECT f.profile_id
    FROM public.favorites f
    WHERE f.favorite_profile_id = NEW.host_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_profile_id = f.profile_id AND b.blocked_profile_id = NEW.host_profile_id)
           OR (b.blocker_profile_id = NEW.host_profile_id AND b.blocked_profile_id = f.profile_id)
      )
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'favorite_match', 'favorite_activity',
      COALESCE(v_host_name, 'A favorite') || CASE WHEN NEW.is_class THEN ' created a class' ELSE ' created a match' END,
      COALESCE(NEW.club_name, 'Match') || ' — ' || to_char(NEW.starts_at, 'Dy DD Mon, HH24:MI') || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_favorite_match_joined()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_event RECORD;
  v_name TEXT;
  v_count INT;
  v_slots INT;
BEGIN
  SELECT id, host_profile_id, starts_at, club_name, extra_confirmed, status, is_class, class_students
    INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  IF v_event.id IS NULL OR v_event.starts_at <= now() THEN RETURN NEW; END IF;
  IF v_event.host_profile_id = NEW.profile_id THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM public.match_event_participants WHERE match_event_id = NEW.match_event_id;
  v_slots := public.match_event_capacity(v_event.is_class, v_event.class_students) - (v_count + COALESCE(v_event.extra_confirmed, 0));
  IF v_slots <= 0 THEN RETURN NEW; END IF;

  SELECT first_name INTO v_name FROM public.profiles WHERE id = NEW.profile_id;
  FOR r IN
    SELECT f.profile_id
    FROM public.favorites f
    WHERE f.favorite_profile_id = NEW.profile_id
      AND NOT EXISTS (
        SELECT 1 FROM public.match_event_participants p
        WHERE p.match_event_id = NEW.match_event_id AND p.profile_id = f.profile_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_profile_id = f.profile_id AND b.blocked_profile_id = NEW.profile_id)
           OR (b.blocker_profile_id = NEW.profile_id AND b.blocked_profile_id = f.profile_id)
      )
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'favorite_match', 'favorite_activity',
      COALESCE(v_name, 'A favorite') || CASE WHEN v_event.is_class THEN ' joined a class' ELSE ' joined a match' END,
      COALESCE(v_event.club_name, 'Match') || ' — ' || to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fanout_match_alerts(_match_id uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev record;
  a record;
  dow smallint;
  hr smallint;
  my_rank int;
  ev_min_rank int;
  ev_max_rank int;
  participant_count int;
  slot_url text;
BEGIN
  SELECT * INTO ev FROM public.match_events WHERE id = _match_id;
  IF NOT FOUND OR ev.status <> 'open' OR ev.starts_at <= now() THEN
    RETURN;
  END IF;

  SELECT count(*) INTO participant_count FROM public.match_event_participants WHERE match_event_id = ev.id;
  IF (1 + participant_count + COALESCE(ev.extra_confirmed,0)) >= public.match_event_capacity(ev.is_class, ev.class_students) THEN
    RETURN;
  END IF;

  dow := EXTRACT(DOW FROM ev.starts_at)::smallint;
  hr := EXTRACT(HOUR FROM ev.starts_at)::smallint;
  ev_min_rank := public.padel_level_rank(ev.level_min);
  ev_max_rank := public.padel_level_rank(ev.level_max);
  slot_url := '/app/events/' || ev.id::text;

  FOR a IN
    SELECT ma.*, p.level AS padel_level
    FROM public.match_alerts ma
    JOIN public.profiles p ON p.id = ma.profile_id
    WHERE ma.active
      AND ma.profile_id <> ev.host_profile_id
      AND dow = ANY(ma.days_of_week)
      AND hr >= ma.hour_start AND hr < ma.hour_end
      AND (ma.city IS NULL OR ma.city = '' OR lower(coalesce(ev.city,'')) = lower(ma.city) OR lower(coalesce(ev.club_address,'')) LIKE '%' || lower(ma.city) || '%')
      AND NOT EXISTS (SELECT 1 FROM public.match_event_participants mp WHERE mp.match_event_id = ev.id AND mp.profile_id = ma.profile_id)
      AND NOT EXISTS (SELECT 1 FROM public.match_alert_hits h WHERE h.alert_id = ma.id AND h.match_event_id = ev.id AND h.reason = _reason)
  LOOP
    IF a.level_only THEN
      my_rank := public.padel_level_rank(a.padel_level);
      IF my_rank IS NULL OR ev_min_rank IS NULL OR ev_max_rank IS NULL OR my_rank < ev_min_rank OR my_rank > ev_max_rank THEN
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.match_alert_hits(alert_id, match_event_id, reason) VALUES (a.id, ev.id, _reason);

    INSERT INTO public.notifications(profile_id, type, title, body, url)
    VALUES (
      a.profile_id,
      'match_alert',
      CASE _reason WHEN 'new_match' THEN 'New match matches your alert' ELSE 'A spot just opened' END,
      coalesce(ev.city, ev.club_name) || ' · ' || to_char(ev.starts_at, 'Dy HH24:MI'),
      slot_url
    );

    INSERT INTO public.push_outbox(profile_id, title, body, url, type)
    VALUES (
      a.profile_id,
      CASE _reason WHEN 'new_match' THEN 'New padel match nearby' ELSE 'A padel spot just opened' END,
      coalesce(ev.city, ev.club_name) || ' · ' || to_char(ev.starts_at, 'Dy HH24:MI'),
      slot_url,
      'match_alert'
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.public_match_view(_event_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', me.id,
    'starts_at', me.starts_at,
    'club_name', me.club_name,
    'club_address', me.club_address,
    'city', me.city, 'country', me.country,
    'gender_rule', me.gender_rule,
    'level_min', me.level_min, 'level_max', me.level_max,
    'note', me.note, 'court_booked', me.court_booked, 'free_court', me.free_court, 'status', me.status,
    'is_class', me.is_class, 'class_students', me.class_students, 'class_fee', me.class_fee,
    'capacity', public.match_event_capacity(me.is_class, me.class_students),
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
$function$;