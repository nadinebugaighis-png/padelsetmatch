ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS joins_on_playtomic boolean NOT NULL DEFAULT false;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_playtomic_join_needs_link
  CHECK (NOT joins_on_playtomic OR playtomic_link IS NOT NULL);

CREATE OR REPLACE FUNCTION public.block_app_joins_on_playtomic_games()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ext boolean;
  v_host uuid;
BEGIN
  SELECT joins_on_playtomic, host_profile_id INTO v_ext, v_host
    FROM public.match_events WHERE id = NEW.match_event_id;
  IF NOT COALESCE(v_ext, false) THEN
    RETURN NEW;
  END IF;
  -- The organiser sits in the line-up; everyone else joins on Playtomic.
  IF TG_TABLE_NAME = 'match_event_participants' AND NEW.profile_id = v_host THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Join this match on Playtomic';
END $function$;

REVOKE EXECUTE ON FUNCTION public.block_app_joins_on_playtomic_games() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS block_app_joins_on_playtomic_games ON public.match_event_participants;
CREATE TRIGGER block_app_joins_on_playtomic_games
  BEFORE INSERT ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.block_app_joins_on_playtomic_games();

DROP TRIGGER IF EXISTS block_app_joins_on_playtomic_games ON public.guest_participants;
CREATE TRIGGER block_app_joins_on_playtomic_games
  BEFORE INSERT ON public.guest_participants
  FOR EACH ROW EXECUTE FUNCTION public.block_app_joins_on_playtomic_games();

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
    'joins_on_playtomic', me.joins_on_playtomic,
    'playtomic_link', CASE WHEN me.joins_on_playtomic THEN me.playtomic_link ELSE NULL END,
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
    AND me.starts_at > now() - interval '2 hours'
    AND (NOT me.joins_on_playtomic OR me.starts_at > now());
$function$;