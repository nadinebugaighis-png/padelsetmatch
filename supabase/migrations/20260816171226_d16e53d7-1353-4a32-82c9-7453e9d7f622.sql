CREATE OR REPLACE FUNCTION public.check_match_event_full()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_p int; v_g int; v_extra int; v_total int;
BEGIN
  v_event_id := COALESCE(NEW.match_event_id, OLD.match_event_id);
  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = v_event_id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = v_event_id;
  SELECT extra_confirmed INTO v_extra FROM public.match_events WHERE id = v_event_id;
  v_total := v_p + v_g + COALESCE(v_extra, 0);
  IF v_total >= 4 THEN
    UPDATE public.match_events SET status = 'full' WHERE id = v_event_id AND status = 'open';
  ELSE
    UPDATE public.match_events SET status = 'open' WHERE id = v_event_id AND status = 'full';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_mep_check_full ON public.match_event_participants;
CREATE TRIGGER trg_mep_check_full
AFTER INSERT OR DELETE ON public.match_event_participants
FOR EACH ROW EXECUTE FUNCTION public.check_match_event_full();

CREATE OR REPLACE FUNCTION public.sync_match_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p int; v_g int; v_total int;
BEGIN
  IF NEW.status NOT IN ('open','full') THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_p FROM public.match_event_participants WHERE match_event_id = NEW.id;
  SELECT count(*) INTO v_g FROM public.guest_participants WHERE match_event_id = NEW.id;
  v_total := v_p + v_g + COALESCE(NEW.extra_confirmed, 0);
  NEW.status := CASE WHEN v_total >= 4 THEN 'full'::public.match_event_status ELSE 'open'::public.match_event_status END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_match_events_capacity ON public.match_events;
CREATE TRIGGER trg_match_events_capacity
BEFORE UPDATE OF extra_confirmed ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.sync_match_event_capacity();

UPDATE public.match_events me
SET status = 'open'
WHERE me.status = 'full'
  AND (
    (SELECT count(*) FROM public.match_event_participants p WHERE p.match_event_id = me.id)
    + (SELECT count(*) FROM public.guest_participants g WHERE g.match_event_id = me.id)
    + COALESCE(me.extra_confirmed, 0)
  ) < 4;

DELETE FROM auth.users WHERE email IN ('nadine@marches.com', 'nadine@narches.es');