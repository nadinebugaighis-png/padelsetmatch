CREATE OR REPLACE FUNCTION public.notify_match_cancelled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_when TEXT;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
BEGIN
  IF NEW.status = 'cancelled'::match_event_status
     AND (OLD.status IS DISTINCT FROM 'cancelled'::match_event_status) THEN
    v_when := to_char(NEW.starts_at AT TIME ZONE 'UTC', 'Dy DD Mon HH24:MI');
    v_title := 'Match cancelled';
    v_body := 'Your match at ' || COALESCE(NEW.club_name, 'the club') || ' (' || v_when || ' UTC) was cancelled by the host.';
    v_url := '/app/events/' || NEW.id::text;

    FOR r IN
      SELECT p.profile_id
      FROM public.match_event_participants p
      WHERE p.match_event_id = NEW.id
        AND p.profile_id <> NEW.host_profile_id
    LOOP
      PERFORM public.enqueue_notification(
        r.profile_id,
        'match_cancelled',
        'matches',
        v_title,
        v_body,
        v_url
      );
    END LOOP;

    INSERT INTO public.match_event_messages (match_event_id, sender_profile_id, body)
    VALUES (NEW.id, NEW.host_profile_id, '⚠️ This match has been cancelled by the host.');
  END IF;

  RETURN NEW;
END;
$function$;