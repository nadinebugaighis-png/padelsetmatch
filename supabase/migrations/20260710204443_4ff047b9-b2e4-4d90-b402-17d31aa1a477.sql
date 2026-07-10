CREATE OR REPLACE FUNCTION public.fanout_match_alerts(_match_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF (1 + participant_count + COALESCE(ev.extra_confirmed,0)) >= 4 THEN
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
$$;

REVOKE ALL ON FUNCTION public.fanout_match_alerts(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fanout_match_alerts(uuid, text) FROM anon, authenticated;