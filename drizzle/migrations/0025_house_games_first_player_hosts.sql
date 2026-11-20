CREATE OR REPLACE FUNCTION public.house_game_unclaimed(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.match_events me
     WHERE me.id = _event_id
       AND me.auto_slot_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.match_event_participants p
          WHERE p.match_event_id = me.id AND p.profile_id = me.host_profile_id
       )
  );
$$;

-- First player into a ready-made game becomes its host.
CREATE OR REPLACE FUNCTION public.claim_house_game_host()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ev record;
BEGIN
  SELECT id, host_profile_id, auto_slot_id INTO ev
    FROM public.match_events WHERE id = NEW.match_event_id FOR UPDATE;
  IF ev.id IS NULL OR ev.auto_slot_id IS NULL OR ev.host_profile_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.match_event_participants p
              WHERE p.match_event_id = ev.id AND p.profile_id = ev.host_profile_id) THEN
    RETURN NEW;
  END IF;
  UPDATE public.match_events SET host_profile_id = NEW.profile_id WHERE id = ev.id;
  RETURN NEW;
END;
$$;

-- When the host of a ready-made game leaves, the next player hosts;
-- with nobody left, the game returns to neutral (the house organiser).
CREATE OR REPLACE FUNCTION public.release_house_game_host()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ev record;
  v_next uuid;
  v_house uuid;
BEGIN
  SELECT id, host_profile_id, auto_slot_id INTO ev
    FROM public.match_events WHERE id = OLD.match_event_id;
  IF ev.id IS NULL OR ev.auto_slot_id IS NULL OR ev.host_profile_id <> OLD.profile_id THEN
    RETURN OLD;
  END IF;
  SELECT p.profile_id INTO v_next FROM public.match_event_participants p
   WHERE p.match_event_id = ev.id ORDER BY p.joined_at ASC LIMIT 1;
  IF v_next IS NULL THEN
    SELECT s.host_profile_id INTO v_house FROM public.open_game_slots s WHERE s.id = ev.auto_slot_id;
    v_next := COALESCE(v_house, ev.host_profile_id);
  END IF;
  IF v_next <> ev.host_profile_id THEN
    UPDATE public.match_events SET host_profile_id = v_next WHERE id = ev.id;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_house_game_host() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_house_game_host() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.house_game_unclaimed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.house_game_unclaimed(uuid) TO authenticated, service_role;

-- Named to run after the join/leave alert triggers, so alerts see the old host.
DROP TRIGGER IF EXISTS trg_zz_claim_house_host ON public.match_event_participants;
CREATE TRIGGER trg_zz_claim_house_host
  AFTER INSERT ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.claim_house_game_host();

DROP TRIGGER IF EXISTS trg_zz_release_house_host ON public.match_event_participants;
CREATE TRIGGER trg_zz_release_house_host
  AFTER DELETE ON public.match_event_participants
  FOR EACH ROW EXECUTE FUNCTION public.release_house_game_host();

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