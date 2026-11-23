ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level_rating numeric(2,1)
  CHECK (level_rating IS NULL OR (level_rating >= 0 AND level_rating <= 7));

CREATE OR REPLACE FUNCTION public.sync_level_from_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.level_rating IS NOT NULL THEN
    NEW.level := CASE
      WHEN NEW.level_rating < 2.5 THEN 'just starting'
      WHEN NEW.level_rating < 3.5 THEN 'casual'
      WHEN NEW.level_rating < 4.5 THEN 'intermediate'
      WHEN NEW.level_rating < 5.5 THEN 'advanced'
      ELSE 'competitive'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_level_from_rating ON public.profiles;
CREATE TRIGGER profiles_sync_level_from_rating
  BEFORE INSERT OR UPDATE OF level_rating, level ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_level_from_rating();