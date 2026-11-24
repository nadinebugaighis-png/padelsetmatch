CREATE OR REPLACE FUNCTION public.coach_slot_requires_active_coach()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status = 'requested'
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.coach_profile_id AND is_coach) THEN
    RAISE EXCEPTION 'This time is no longer available';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.coach_slot_requires_active_coach() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS coach_slot_requires_active_coach ON public.coach_slots;
CREATE TRIGGER coach_slot_requires_active_coach BEFORE UPDATE OF status ON public.coach_slots
FOR EACH ROW EXECUTE FUNCTION public.coach_slot_requires_active_coach();