ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS time_tbd boolean NOT NULL DEFAULT false;
ALTER TABLE public.open_game_slots ADD COLUMN IF NOT EXISTS time_tbd boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ensure_open_games(_days_ahead integer DEFAULT 7)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      CONTINUE WHEN NOT s.time_tbd AND EXISTS (
        SELECT 1 FROM public.match_events e
         WHERE lower(coalesce(e.city, '')) = lower(s.city)
           AND e.starts_at = v_start
           AND e.level_min = s.level_min AND e.level_max = s.level_max
      );
      INSERT INTO public.match_events (host_profile_id, starts_at, club_name, city, country, level_min, level_max, gender_rule, note, status, auto_slot_id, time_tbd)
      VALUES (s.host_profile_id, v_start, s.club_name, s.city, s.country, s.level_min, s.level_max, 'open', s.note, 'open', s.id, s.time_tbd);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  PERFORM set_config('app.house_games', 'off', true);
  RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_open_games(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_open_games(int) TO service_role;

CREATE OR REPLACE FUNCTION public.list_public_upcoming_matches(_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'starts_at'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', me.id, 'starts_at', me.starts_at, 'time_tbd', me.time_tbd, 'club_name', me.club_name,
      'city', me.city, 'club_address', me.club_address,
      'level_min', me.level_min, 'level_max', me.level_max, 'gender_rule', me.gender_rule,
      'status', me.status,
      'court_booked', me.court_booked,
      'free_court', me.free_court,
      'note', me.note,
      'filled', COALESCE((SELECT count(*) FROM public.match_event_participants p WHERE p.match_event_id = me.id), 0)
              + COALESCE((SELECT count(*) FROM public.guest_participants g WHERE g.match_event_id = me.id), 0)
              + COALESCE(me.extra_confirmed, 0),
      'participant_names', COALESCE((
        SELECT jsonb_agg(n ORDER BY n)
        FROM (
          SELECT pr.first_name AS n
          FROM public.match_event_participants p
          JOIN public.profiles pr ON pr.id = p.profile_id
          WHERE p.match_event_id = me.id
          UNION ALL
          SELECT g.display_name
          FROM public.guest_participants g
          WHERE g.match_event_id = me.id
        ) names
      ), '[]'::jsonb),
      'host_name', CASE WHEN public.house_game_unclaimed(me.id) THEN NULL
                        ELSE (SELECT first_name FROM public.profiles WHERE id = me.host_profile_id) END
    ) AS row
    FROM public.match_events me
    WHERE me.status IN ('open','full','played')
      AND me.starts_at > now() - interval '4 hours'
      AND me.starts_at < now() + interval '30 days'
    ORDER BY me.starts_at ASC
    LIMIT GREATEST(1, LEAST(_limit, 100))
  ) sub;
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
    'time_tbd', me.time_tbd,
    'duration_minutes', me.duration_minutes,
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
    'host', CASE WHEN public.house_game_unclaimed(me.id) THEN NULL
                 ELSE (SELECT jsonb_build_object('first_name', pr.first_name) FROM public.profiles pr WHERE pr.id = me.host_profile_id) END,
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