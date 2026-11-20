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
      coalesce(ev.city, ev.club_name) || ' · ' || CASE WHEN ev.time_tbd THEN to_char(ev.starts_at, 'Dy') ELSE to_char(ev.starts_at, 'Dy HH24:MI') END,
      slot_url
    );

    INSERT INTO public.push_outbox(profile_id, title, body, url, type)
    VALUES (
      a.profile_id,
      CASE _reason WHEN 'new_match' THEN 'New padel match nearby' ELSE 'A padel spot just opened' END,
      coalesce(ev.city, ev.club_name) || ' · ' || CASE WHEN ev.time_tbd THEN to_char(ev.starts_at, 'Dy') ELSE to_char(ev.starts_at, 'Dy HH24:MI') END,
      slot_url,
      'match_alert'
    );
  END LOOP;
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
      COALESCE(v_event.club_name, 'Match') || ' — ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at, 'Dy DD Mon') ELSE to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') END || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

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
    COALESCE(v_event.club_name, 'Match') || ' — ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at AT TIME ZONE v_tz, 'Dy DD Mon') ELSE to_char(v_event.starts_at AT TIME ZONE v_tz, 'Dy DD Mon, HH24:MI') END || ' · Accept or decline',
    '/app/events/' || NEW.match_event_id::text
  );
  RETURN NEW;
END;
$function$;

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
      COALESCE(v_event.club_name, 'Match') || ' — ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at, 'Dy DD Mon') ELSE to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') END,
      '/app/events/' || NEW.match_event_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

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
      COALESCE(v_event.club_name, 'Match') || ' — ' || CASE WHEN v_event.time_tbd THEN to_char(v_event.starts_at, 'Dy DD Mon') ELSE to_char(v_event.starts_at, 'Dy DD Mon, HH24:MI') END,
      '/app/events/' || OLD.match_event_id::text
    );
  END LOOP;
  RETURN OLD;
END;
$function$;