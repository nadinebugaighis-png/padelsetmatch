ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS poster_path text;
COMMENT ON COLUMN public.competitions.poster_url IS 'DEPRECATED: replaced by poster_path; posters are now shown through short-lived signed links';

CREATE OR REPLACE FUNCTION public.guard_competition_poster_path() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.poster_path IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.poster_path IS DISTINCT FROM OLD.poster_path)
     AND split_part(NEW.poster_path, '/', 1) <> COALESCE(auth.uid()::text, '')
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Poster must be your own upload';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_competition_poster_path() FROM anon, public;

DROP TRIGGER IF EXISTS guard_competition_poster_path ON public.competitions;
CREATE TRIGGER guard_competition_poster_path
  BEFORE INSERT OR UPDATE OF poster_path ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.guard_competition_poster_path();