CREATE TABLE public.open_game_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series text NOT NULL,
  host_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  country text NOT NULL,
  club_name text NOT NULL,
  time_zone text NOT NULL,
  local_start time NOT NULL,
  level_min text NOT NULL,
  level_max text NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series, local_start, level_min, level_max)
);
GRANT ALL ON public.open_game_slots TO service_role;
ALTER TABLE public.open_game_slots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.open_game_runs (
  slot_id uuid NOT NULL REFERENCES public.open_game_slots(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slot_id, starts_at)
);
GRANT ALL ON public.open_game_runs TO service_role;
ALTER TABLE public.open_game_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS auto_slot_id uuid REFERENCES public.open_game_slots(id) ON DELETE SET NULL;

-- Ready-made games are created quietly: no host seat, no alert fan-out.
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.house_games', true) = 'on' THEN RETURN NEW; END IF;
  INSERT INTO public.match_event_participants (match_event_id, profile_id)
  VALUES (NEW.id, NEW.host_profile_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_alert_on_match_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.house_games', true) = 'on' THEN RETURN NEW; END IF;
  PERFORM public.fanout_match_alerts(NEW.id, 'new_match');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_favorite_match_created()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_host_name TEXT;
  v_slots INT;
BEGIN
  IF current_setting('app.house_games', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.starts_at <= now() THEN RETURN NEW; END IF;
  v_slots := 4 - (1 + COALESCE(NEW.extra_confirmed, 0));
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
      COALESCE(v_host_name, 'A favorite') || ' created a match',
      COALESCE(NEW.club_name, 'Match') || ' — ' || to_char(NEW.starts_at, 'Dy DD Mon, HH24:MI') || ' · ' || v_slots || ' spot' || CASE WHEN v_slots = 1 THEN '' ELSE 's' END || ' left',
      '/app/events/' || NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_open_games(_days_ahead int DEFAULT 7)
 RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s record;
  d int;
  v_start timestamptz;
  v_count int := 0;
BEGIN
  PERFORM set_config('app.house_games', 'on', true);
  FOR s IN SELECT * FROM public.open_game_slots WHERE active LOOP
    FOR d IN 0.._days_ahead LOOP
      v_start := (((now() AT TIME ZONE s.time_zone)::date + d) + s.local_start) AT TIME ZONE s.time_zone;
      CONTINUE WHEN v_start <= now();
      CONTINUE WHEN EXISTS (SELECT 1 FROM public.open_game_runs r WHERE r.slot_id = s.id AND r.starts_at = v_start);
      INSERT INTO public.open_game_runs (slot_id, starts_at) VALUES (s.id, v_start);
      -- A hand-made game already covers this slot.
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.match_events e
         WHERE lower(coalesce(e.city, '')) = lower(s.city)
           AND e.starts_at = v_start
           AND e.level_min = s.level_min AND e.level_max = s.level_max
      );
      INSERT INTO public.match_events (host_profile_id, starts_at, club_name, city, country, level_min, level_max, gender_rule, note, status, auto_slot_id)
      VALUES (s.host_profile_id, v_start, s.club_name, s.city, s.country, s.level_min, s.level_max, 'open', s.note, 'open', s.id);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  PERFORM set_config('app.house_games', 'off', true);
  RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_open_games(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_open_games(int) TO service_role;

INSERT INTO public.open_game_slots (series, host_profile_id, city, country, club_name, time_zone, local_start, level_min, level_max, note) VALUES
('la-moraleja', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'La Moraleja', 'Spain', 'La Moraleja · Club por decidir', 'Europe/Madrid', '09:30', 'just starting', 'casual',
 '09:30–11:00 · Partida abierta en La Moraleja. Plazas por orden de llegada. Elegimos el club y organizamos la reserva en el chat al completar 4 jugadores.'),
('la-moraleja', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'La Moraleja', 'Spain', 'La Moraleja · Club por decidir', 'Europe/Madrid', '09:30', 'intermediate', 'advanced',
 '09:30–11:00 · Partida abierta en La Moraleja. Plazas por orden de llegada. Elegimos el club y organizamos la reserva en el chat al completar 4 jugadores.'),
('la-moraleja', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'La Moraleja', 'Spain', 'La Moraleja · Club por decidir', 'Europe/Madrid', '19:30', 'just starting', 'advanced',
 '19:30–21:00 · Partida abierta en La Moraleja para todos los niveles. Plazas por orden de llegada. Elegimos el club y organizamos la reserva en el chat al completar 4 jugadores.'),
('london', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'London', 'United Kingdom', 'London · Club to be decided', 'Europe/London', '09:30', 'just starting', 'casual',
 '09:30–11:00 · Open game in London. First come, first served. Once 4 players join, we choose the club and arrange the booking in the chat.'),
('london', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'London', 'United Kingdom', 'London · Club to be decided', 'Europe/London', '09:30', 'intermediate', 'advanced',
 '09:30–11:00 · Open game in London. First come, first served. Once 4 players join, we choose the club and arrange the booking in the chat.'),
('london', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'London', 'United Kingdom', 'London · Club to be decided', 'Europe/London', '19:30', 'just starting', 'advanced',
 '19:30–21:00 · Open game in London for all levels. First come, first served. Once 4 players join, we choose the club and arrange the booking in the chat.'),
('dubai', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'Dubai', 'United Arab Emirates', 'Dubai · Club to be decided', 'Asia/Dubai', '09:30', 'just starting', 'casual',
 '09:30–11:00 · Open game in Dubai. First come, first served. Once 4 players join, we choose the club and arrange the booking in the chat.'),
('dubai', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'Dubai', 'United Arab Emirates', 'Dubai · Club to be decided', 'Asia/Dubai', '09:30', 'intermediate', 'advanced',
 '09:30–11:00 · Open game in Dubai. First come, first served. Once 4 players join, we choose the club and arrange the booking in the chat.'),
('dubai', '9c0a8237-1635-4cbf-b386-36aecf6cf6e3', 'Dubai', 'United Arab Emirates', 'Dubai · Club to be decided', 'Asia/Dubai', '19:30', 'just starting', 'advanced',
 '19:30–21:00 · Open game in Dubai for all levels. First come, first served. Once 4 players join, we choose the club and arrange the booking in the chat.');

SELECT public.ensure_open_games(7);

SELECT cron.schedule('ensure-open-games', '5 * * * *', $cron$SELECT public.ensure_open_games(7);$cron$);