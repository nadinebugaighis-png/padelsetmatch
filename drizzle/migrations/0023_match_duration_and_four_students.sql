ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS duration_minutes smallint NOT NULL DEFAULT 90;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_duration_minutes_allowed CHECK (duration_minutes IN (60, 90));

ALTER TABLE public.match_events
  DROP CONSTRAINT IF EXISTS match_events_class_students_range;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_class_students_range CHECK (class_students IS NULL OR class_students BETWEEN 1 AND 4);

CREATE OR REPLACE FUNCTION public.public_match_view(_event_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', me.id,
    'starts_at', me.starts_at,
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