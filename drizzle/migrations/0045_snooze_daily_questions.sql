ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS questions_snoozed_until timestamptz;

CREATE OR REPLACE FUNCTION public.snooze_my_questions()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_until timestamptz := now() + interval '7 days';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  UPDATE public.profiles SET questions_snoozed_until = v_until WHERE user_id = auth.uid();
  RETURN v_until;
END $$;

REVOKE ALL ON FUNCTION public.snooze_my_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.snooze_my_questions() TO authenticated;