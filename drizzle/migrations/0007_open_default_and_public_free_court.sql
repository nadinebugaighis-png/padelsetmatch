ALTER TABLE public.match_events ALTER COLUMN gender_rule SET DEFAULT 'open';
UPDATE public.match_events SET gender_rule = 'open' WHERE gender_rule = 'mixed';

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

CREATE OR REPLACE FUNCTION public.list_public_upcoming_matches(_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'starts_at'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', me.id, 'starts_at', me.starts_at, 'club_name', me.club_name,
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
      'host_name', (SELECT first_name FROM public.profiles WHERE id = me.host_profile_id)
    ) AS row
    FROM public.match_events me
    WHERE me.status IN ('open','full','played')
      AND me.starts_at > now() - interval '4 hours'
      AND me.starts_at < now() + interval '30 days'
    ORDER BY me.starts_at ASC
    LIMIT GREATEST(1, LEAST(_limit, 100))
  ) sub;
$function$;