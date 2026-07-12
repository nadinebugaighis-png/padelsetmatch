
CREATE OR REPLACE FUNCTION public.notify_match_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_when TEXT;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status, '') <> 'cancelled' THEN
    v_when := to_char(NEW.starts_at AT TIME ZONE 'UTC', 'Dy DD Mon HH24:MI');
    v_title := 'Match cancelled';
    v_body := 'Your match at ' || COALESCE(NEW.club_name, 'the club') || ' (' || v_when || ' UTC) was cancelled by the host.';
    v_url := '/app/events/' || NEW.id::text;

    -- Notify each participant except the host
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

    -- Post a system message in the match chat (from the host)
    INSERT INTO public.match_event_messages (match_event_id, sender_profile_id, body)
    VALUES (NEW.id, NEW.host_profile_id, '⚠️ This match has been cancelled by the host.');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_match_cancelled ON public.match_events;
CREATE TRIGGER trg_notify_match_cancelled
  AFTER UPDATE OF status ON public.match_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_cancelled();
