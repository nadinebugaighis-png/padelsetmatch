CREATE OR REPLACE FUNCTION public.notify_match_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_host TEXT; v_event RECORD;
BEGIN
  IF NEW.invitee_profile_id IS NULL OR NEW.status <> 'pending' OR NEW.invitee_profile_id = NEW.inviter_profile_id THEN
    RETURN NEW;
  END IF;
  SELECT id, club_name, starts_at, status, is_class INTO v_event FROM public.match_events WHERE id = NEW.match_event_id;
  IF v_event.id IS NULL OR v_event.status = 'cancelled' OR v_event.starts_at < now() THEN
    RETURN NEW;
  END IF;
  SELECT first_name INTO v_host FROM public.profiles WHERE id = NEW.inviter_profile_id;
  PERFORM public.enqueue_notification(
    NEW.invitee_profile_id, 'match_invite', 'matches',
    COALESCE(v_host, 'A player') || ' invited you to ' || CASE WHEN COALESCE(v_event.is_class, false) THEN 'a class' ELSE 'a match' END,
    COALESCE(v_event.club_name, 'Match') || ' — ' || to_char(v_event.starts_at AT TIME ZONE 'Europe/Madrid', 'Dy DD Mon, HH24:MI') || ' · Accept or decline',
    '/app/events/' || NEW.match_event_id::text
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_match_invite() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_match_invite ON public.match_event_invites;
CREATE TRIGGER trg_notify_match_invite
AFTER INSERT ON public.match_event_invites
FOR EACH ROW EXECUTE FUNCTION public.notify_match_invite();