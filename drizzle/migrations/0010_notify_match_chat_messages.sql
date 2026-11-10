CREATE OR REPLACE FUNCTION public.notify_match_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_event RECORD;
  v_sender_name TEXT;
  v_preview TEXT;
  v_url TEXT;
BEGIN
  SELECT id, club_name, status INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  -- Cancelled matches already send their own cancellation notice.
  IF v_event.id IS NULL OR v_event.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_profile_id IS NOT NULL THEN
    SELECT first_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_profile_id;
  ELSIF NEW.guest_id IS NOT NULL THEN
    SELECT display_name INTO v_sender_name FROM public.guest_participants WHERE id = NEW.guest_id;
  END IF;

  v_preview := CASE WHEN char_length(NEW.body) > 80 THEN substring(NEW.body, 1, 77) || '…' ELSE NEW.body END;
  v_url := '/app/events/' || NEW.match_event_id::text;

  FOR r IN
    SELECT DISTINCT profile_id FROM public.match_event_participants
    WHERE match_event_id = NEW.match_event_id
      AND profile_id IS NOT NULL
      AND profile_id IS DISTINCT FROM NEW.sender_profile_id
  LOOP
    -- Busy chats: one alert per player per match every 10 minutes while unread.
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.profile_id = r.profile_id
        AND n.type = 'match_chat'
        AND n.url = v_url
        AND n.read_at IS NULL
        AND n.created_at > now() - interval '10 minutes'
    ) THEN
      PERFORM public.enqueue_notification(
        r.profile_id, 'match_chat', 'messages',
        COALESCE(v_sender_name, 'A player') || ' · ' || COALESCE(v_event.club_name, 'Match chat'),
        v_preview,
        v_url
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_match_chat_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_match_chat_message ON public.match_event_messages;
CREATE TRIGGER trg_notify_match_chat_message
  AFTER INSERT ON public.match_event_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_match_chat_message();