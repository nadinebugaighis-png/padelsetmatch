CREATE OR REPLACE FUNCTION public.transfer_match_host(_event uuid, _new_host_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
  v_current_host uuid;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF v_me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;

  SELECT host_profile_id INTO v_current_host FROM public.match_events WHERE id = _event FOR UPDATE;
  IF v_current_host IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_current_host <> v_me THEN RAISE EXCEPTION 'Only the current host can transfer hosting'; END IF;
  IF _new_host_profile_id = v_me THEN RAISE EXCEPTION 'You are already the host'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.match_event_participants
    WHERE match_event_id = _event AND profile_id = _new_host_profile_id
  ) THEN
    RAISE EXCEPTION 'New host must be a joined player';
  END IF;

  -- Only the host changes; the line-up stays exactly as it was, so no
  -- join/leave notifications fire and nobody loses their spot.
  UPDATE public.match_events
    SET host_profile_id = _new_host_profile_id, updated_at = now()
    WHERE id = _event;

  INSERT INTO public.notifications (profile_id, type, title, body, url)
  VALUES (
    _new_host_profile_id,
    'match_host_transferred',
    'You''re the new host',
    'The previous host passed hosting to you.',
    '/app/events/' || _event::text
  );
END;
$function$;

-- Restore the new host removed by the old transfer logic, silently.
ALTER TABLE public.match_event_participants DISABLE TRIGGER trg_notify_participant_joined;
ALTER TABLE public.match_event_participants DISABLE TRIGGER trg_notify_favorite_match_joined;

INSERT INTO public.match_event_participants (match_event_id, profile_id)
SELECT e.id, e.host_profile_id
FROM public.match_events e
WHERE e.id = 'd20943ba-2d9d-4aa3-b9de-930cf11a4533'
  AND e.host_profile_id = '1829a2eb-f4ba-4d60-870c-d1cb4cd176f4'
  AND NOT EXISTS (
    SELECT 1 FROM public.match_event_participants p
    WHERE p.match_event_id = e.id AND p.profile_id = e.host_profile_id
  );

ALTER TABLE public.match_event_participants ENABLE TRIGGER trg_notify_participant_joined;
ALTER TABLE public.match_event_participants ENABLE TRIGGER trg_notify_favorite_match_joined;