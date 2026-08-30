-- Remove dead coach endorsement/review infrastructure after the coach feature was simplified to a simple on/off badge.
DROP FUNCTION IF EXISTS public.open_coach_chat(uuid, uuid);
DROP FUNCTION IF EXISTS public.coach_stats(uuid);
DROP TABLE IF EXISTS public.coach_endorsements CASCADE;