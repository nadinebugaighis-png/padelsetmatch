CREATE OR REPLACE FUNCTION public.check_app_health_alerts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _win_start timestamptz := now() - interval '60 minutes';
  _sessions int;
  _crash_sessions int;
  _rate numeric;
  _raised int := 0;
  _sig record;
  _bucket text := to_char(date_trunc('hour', now()), 'YYYY-MM-DD"T"HH24');
BEGIN
  SELECT count(DISTINCT session_id) INTO _sessions
  FROM public.app_events
  WHERE created_at >= _win_start AND session_id IS NOT NULL;

  SELECT count(DISTINCT session_id) INTO _crash_sessions
  FROM public.app_events
  WHERE created_at >= _win_start AND session_id IS NOT NULL AND kind = 'crash';

  IF _sessions >= 10 THEN
    _rate := round((1 - (_crash_sessions::numeric / _sessions)) * 100, 1);
    IF _rate < 95 THEN
      IF public.raise_app_alert(
        'crash_free_drop',
        'crash_free_drop:' || _bucket,
        'Crash-free sessions dropped to ' || _rate || '%',
        _crash_sessions || ' of ' || _sessions || ' sessions crashed in the last hour.',
        jsonb_build_object('rate', _rate, 'sessions', _sessions, 'crash_sessions', _crash_sessions)
      ) THEN
        _raised := _raised + 1;
      END IF;
    END IF;
  END IF;

  FOR _sig IN
    SELECT sig, cnt FROM (
      SELECT
        (name || ': ' || left(COALESCE(message, ''), 80)) AS sig,
        count(*) AS cnt
      FROM public.app_events
      WHERE kind = 'crash' AND created_at >= _win_start
      GROUP BY 1
    ) recent
    WHERE NOT EXISTS (
      SELECT 1 FROM public.app_events old
      WHERE old.kind = 'crash'
        AND old.created_at < _win_start
        AND old.created_at >= now() - interval '14 days'
        AND (old.name || ': ' || left(COALESCE(old.message, ''), 80)) = recent.sig
    )
    ORDER BY cnt DESC
    LIMIT 5
  LOOP
    IF public.raise_app_alert(
      'new_crash_signature',
      'new_crash:' || md5(_sig.sig),
      'New crash: ' || left(_sig.sig, 90),
      _sig.cnt || ' occurrence(s) in the last hour, not seen in the previous 14 days.',
      jsonb_build_object('signature', _sig.sig, 'count', _sig.cnt)
    ) THEN
      _raised := _raised + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('sessions', _sessions, 'crash_sessions', _crash_sessions, 'raised', _raised);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ignore_intro(_match_id uuid, _acting_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    RAISE EXCEPTION 'Already accepted, use block or delete instead';
  END IF;
  IF v_me = v_match.initiator_profile_id THEN
    RAISE EXCEPTION 'Cannot ignore your own intro';
  END IF;
  DELETE FROM public.messages WHERE match_id = _match_id;
  DELETE FROM public.matches WHERE id = _match_id;
END;
$function$
;

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
      COALESCE(NEW.club_name, 'Match') || ' · ' || to_char(NEW.starts_at, 'Dy DD Mon, HH24:MI') || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$
;

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
  SELECT id, host_profile_id, starts_at, time_tbd, club_name, extra_confirmed, status, is_class, class_students
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
      COALESCE(v_event.club_name, 'Match') || ' · ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at, 'Dy DD Mon') ELSE to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') END || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_match_invite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_host TEXT; v_event RECORD; v_tz TEXT;
BEGIN
  IF NEW.invitee_profile_id IS NULL OR NEW.status <> 'pending' OR NEW.invitee_profile_id = NEW.inviter_profile_id THEN
    RETURN NEW;
  END IF;
  SELECT id, club_name, club_address, city, starts_at, time_tbd, status, is_class INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  IF v_event.id IS NULL OR v_event.status = 'cancelled' OR v_event.starts_at < now() THEN
    RETURN NEW;
  END IF;
  v_tz := CASE
    WHEN lower(coalesce(v_event.city,'') || ' ' || coalesce(v_event.club_address,'')) LIKE '%london%' THEN 'Europe/London'
    WHEN lower(coalesce(v_event.city,'') || ' ' || coalesce(v_event.club_address,'')) LIKE '%dubai%' THEN 'Asia/Dubai'
    WHEN lower(coalesce(v_event.city,'') || ' ' || coalesce(v_event.club_address,'')) LIKE '%miami%' THEN 'America/New_York'
    ELSE 'Europe/Madrid' END;
  SELECT first_name INTO v_host FROM public.profiles WHERE id = NEW.inviter_profile_id;
  PERFORM public.enqueue_notification(
    NEW.invitee_profile_id, 'match_invite', 'matches',
    COALESCE(v_host, 'A player') || ' invited you to ' || CASE WHEN COALESCE(v_event.is_class, false) THEN 'a class' ELSE 'a match' END,
    COALESCE(v_event.club_name, 'Match') || ' · ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at AT TIME ZONE v_tz, 'Dy DD Mon') ELSE to_char(v_event.starts_at AT TIME ZONE v_tz, 'Dy DD Mon, HH24:MI') END || ' · Accept or decline',
    '/app/events/' || NEW.match_event_id::text
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_participant_joined()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_new_name TEXT; v_event RECORD;
BEGIN
  SELECT first_name INTO v_new_name FROM public.profiles WHERE id = NEW.profile_id;
  SELECT id, club_name, starts_at, time_tbd, host_profile_id INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  FOR r IN
    SELECT profile_id FROM public.match_event_participants
    WHERE match_event_id = NEW.match_event_id AND profile_id <> NEW.profile_id
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'match_join', 'match_participants',
      COALESCE(v_new_name, 'A player') || ' joined your match',
      COALESCE(v_event.club_name, 'Match') || ' · ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at, 'Dy DD Mon') ELSE to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') END,
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_participant_left()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_left_name TEXT; v_event RECORD;
BEGIN
  SELECT first_name INTO v_left_name FROM public.profiles WHERE id = OLD.profile_id;
  SELECT id, club_name, starts_at, time_tbd INTO v_event FROM public.match_events WHERE id = OLD.match_event_id;
  FOR r IN
    SELECT profile_id FROM public.match_event_participants
    WHERE match_event_id = OLD.match_event_id AND profile_id <> OLD.profile_id
  LOOP
    PERFORM public.enqueue_notification(
      r.profile_id, 'match_leave', 'match_participants',
      COALESCE(v_left_name, 'A player') || ' left the match',
      COALESCE(v_event.club_name, 'Match') || ' · ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at, 'Dy DD Mon') ELSE to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') END,
      '/app/events/' || OLD.match_event_id::text
    );
  END LOOP;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.open_intro_chat(_target_profile_id uuid, _body text, _acting_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    RAISE EXCEPTION 'Intro limit reached: 5 per day. Try again tomorrow.';
  END IF;

  INSERT INTO public.matches (profile_a, profile_b, origin, initiator_profile_id, last_message_at)
  VALUES (v_a, v_b, 'intro', v_me, now())
  RETURNING id INTO v_match_id;

  INSERT INTO public.messages (match_id, sender_profile_id, body)
  VALUES (v_match_id, v_me, btrim(_body));

  RETURN v_match_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_intro_message(_target_profile_id uuid, _body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Already matched or intro pending, surface as existing thread.
    _match_id := _existing.id;
    IF _existing.accepted_at IS NOT NULL THEN
      -- Fully matched: just send as a normal message.
      INSERT INTO public.messages (match_id, sender_profile_id, body)
      VALUES (_match_id, _me, _body);
      RETURN _match_id;
    END IF;
    -- Pending exists, do not allow spamming a second intro.
    IF _existing.initiator_profile_id = _me THEN
      RAISE EXCEPTION 'You already sent a message request';
    ELSE
      RAISE EXCEPTION 'They already sent you a request. Respond to it first';
    END IF;
  END IF;

  INSERT INTO public.matches (profile_a, profile_b, initiator_profile_id, accepted_at, last_message_at)
  VALUES (_a, _b, _me, NULL, now())
  RETURNING id INTO _match_id;

  INSERT INTO public.messages (match_id, sender_profile_id, body)
  VALUES (_match_id, _me, _body);

  RETURN _match_id;
END;
$function$
;

UPDATE public.notifications SET title = replace(title, ' — ', ' · '), body = replace(body, ' — ', ' · ') WHERE title LIKE '%—%' OR body LIKE '%—%';