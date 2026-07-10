
CREATE TABLE public.match_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text,
  city text,
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::smallint[],
  hour_start smallint NOT NULL DEFAULT 7 CHECK (hour_start BETWEEN 0 AND 23),
  hour_end smallint NOT NULL DEFAULT 23 CHECK (hour_end BETWEEN 1 AND 24),
  level_only boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_match_alerts_active ON public.match_alerts(active) WHERE active;
CREATE INDEX idx_match_alerts_profile ON public.match_alerts(profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_alerts TO authenticated;
GRANT ALL ON public.match_alerts TO service_role;
ALTER TABLE public.match_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own alerts select" ON public.match_alerts FOR SELECT TO authenticated
  USING (profile_id = public.my_profile_id());
CREATE POLICY "own alerts insert" ON public.match_alerts FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.my_profile_id());
CREATE POLICY "own alerts update" ON public.match_alerts FOR UPDATE TO authenticated
  USING (profile_id = public.my_profile_id())
  WITH CHECK (profile_id = public.my_profile_id());
CREATE POLICY "own alerts delete" ON public.match_alerts FOR DELETE TO authenticated
  USING (profile_id = public.my_profile_id());

CREATE TRIGGER trg_match_alerts_updated
BEFORE UPDATE ON public.match_alerts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.match_alert_hits (
  alert_id uuid NOT NULL REFERENCES public.match_alerts(id) ON DELETE CASCADE,
  match_event_id uuid NOT NULL REFERENCES public.match_events(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, match_event_id, reason)
);
GRANT ALL ON public.match_alert_hits TO service_role;
ALTER TABLE public.match_alert_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.padel_level_rank(lvl text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lvl
    WHEN 'beginner' THEN 1
    WHEN 'casual' THEN 2
    WHEN 'intermediate' THEN 3
    WHEN 'advanced' THEN 4
    WHEN 'competitive' THEN 5
    ELSE NULL END;
$$;

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
    SELECT ma.*, p.padel_level
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

CREATE OR REPLACE FUNCTION public.trg_alert_on_match_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.fanout_match_alerts(NEW.id, 'new_match');
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_events_alert_insert
AFTER INSERT ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.trg_alert_on_match_insert();

CREATE OR REPLACE FUNCTION public.trg_alert_on_participant_leave()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.fanout_match_alerts(OLD.match_event_id, 'spot_opened');
  RETURN OLD;
END;
$$;

CREATE TRIGGER match_participants_alert_leave
AFTER DELETE ON public.match_event_participants
FOR EACH ROW EXECUTE FUNCTION public.trg_alert_on_participant_leave();
