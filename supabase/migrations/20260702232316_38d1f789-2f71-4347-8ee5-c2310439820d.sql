-- 1. Add intents array on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intents text[] NOT NULL DEFAULT '{}';

-- Backfill from looking_for
UPDATE public.profiles
SET intents = CASE
  WHEN looking_for = 'partner' THEN ARRAY['relationship','padel']
  WHEN looking_for = 'friend'  THEN ARRAY['friend','padel']
  WHEN looking_for = 'both'    THEN ARRAY['relationship','friend','padel']
  ELSE ARRAY['padel']
END
WHERE (intents IS NULL OR array_length(intents,1) IS NULL);

-- Validate intent values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_intents_valid'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_intents_valid
      CHECK (intents <@ ARRAY['padel','friend','relationship']::text[]);
  END IF;
END $$;

-- 2. Extend hides.category to allow 'padel'
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.hides'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.hides DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.hides
  ADD CONSTRAINT hides_category_valid
  CHECK (category IN ('padel','friend','relationship','partner','all'));
