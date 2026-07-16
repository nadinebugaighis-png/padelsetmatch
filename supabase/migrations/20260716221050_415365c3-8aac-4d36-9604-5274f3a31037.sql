CREATE OR REPLACE FUNCTION public.transfer_match_host(_event uuid, _new_host_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
  v_current_host uuid;
  v_is_participant boolean;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF v_me IS NULL THEN RAISE EXCEPTION 'No profile'; END IF;

  SELECT host_profile_id INTO v_current_host FROM public.match_events WHERE id = _event;
  IF v_current_host IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_current_host <> v_me THEN RAISE EXCEPTION 'Only the current host can transfer hosting'; END IF;
  IF _new_host_profile_id = v_me THEN RAISE EXCEPTION 'You are already the host'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.match_event_participants
    WHERE match_event_id = _event AND profile_id = _new_host_profile_id
  ) INTO v_is_participant;
  IF NOT v_is_participant THEN RAISE EXCEPTION 'New host must be a joined player'; END IF;

  DELETE FROM public.match_event_participants
    WHERE match_event_id = _event AND profile_id = _new_host_profile_id;

  UPDATE public.match_events
    SET host_profile_id = _new_host_profile_id, updated_at = now()
    WHERE id = _event;

  INSERT INTO public.match_event_participants (match_event_id, profile_id)
    VALUES (_event, v_me)
    ON CONFLICT DO NOTHING;

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