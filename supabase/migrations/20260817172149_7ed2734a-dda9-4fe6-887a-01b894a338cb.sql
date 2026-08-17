CREATE OR REPLACE FUNCTION public.guest_join_match(_event_id uuid, _display_name text, _level text, _phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event RECORD; v_p int; v_g int; v_slots int; v_guest_id uuid; v_token uuid; v_existing RECORD;
BEGIN
  IF _display_name IS NULL OR length(trim(_display_name)) < 1 THEN
    RAISE EXCEPTION 'Please enter your name';
  END IF;
  IF _phone IS NULL OR length(trim(_phone)) < 4 THEN
    RAISE EXCEPTION 'Please enter a phone number';
  END IF;
  IF _level = 'beginner' THEN _level := 'just starting'; END IF;
  IF _level IS NULL OR _level NOT IN ('just starting','casual','intermediate','advanced','competitive') THEN
    RAISE EXCEPTION 'Please choose your padel level';
  END IF;

  SELECT * INTO v_event FROM public.match_events WHERE id = _event_id;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'This match was cancelled'; END IF;
  IF v_event.status = 'played' THEN RAISE EXCEPTION 'This match already happened'; END IF;
  IF v_event.starts_at <= now() THEN RAISE EXCEPTION 'This match has already started'; END IF;
  IF v_event.invite_lock_until IS NOT NULL AND now() < v_event.invite_lock_until THEN
    RAISE EXCEPTION 'INVITE_LOCK:%', v_event.invite_lock_until;
  END IF;

  SELECT * INTO v_existing FROM public.guest_participants
    WHERE match_event_id = _event_id AND phone = trim(_phone);
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('guest_id', v_existing.id, 'token', v_existing.session_token);
  END IF;

  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = _event_id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = _event_id;
  v_slots := 4 - (v_p + v_g + COALESCE(v_event.extra_confirmed, 0));
  IF v_slots <= 0 THEN RAISE EXCEPTION 'This match is already full'; END IF;

  INSERT INTO public.guest_participants (match_event_id, display_name, level, phone)
  VALUES (_event_id, trim(_display_name), _level, trim(_phone))
  RETURNING id, session_token INTO v_guest_id, v_token;
  RETURN jsonb_build_object('guest_id', v_guest_id, 'token', v_token);
END $function$;