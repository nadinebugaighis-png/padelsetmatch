CREATE OR REPLACE FUNCTION public.assign_founding_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  IF NEW.founding_number IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.is_seed THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.first_name IS NULL OR trim(NEW.first_name) = '' THEN RETURN NEW; END IF;

  SELECT COALESCE(MAX(founding_number), 0) + 1 INTO next_num FROM public.profiles;
  NEW.founding_number = next_num;
  RETURN NEW;
END $$;

WITH missing AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) + COALESCE((SELECT MAX(founding_number) FROM public.profiles), 0) AS next_number
  FROM public.profiles
  WHERE founding_number IS NULL
    AND NOT is_seed
    AND user_id IS NOT NULL
    AND first_name IS NOT NULL
    AND trim(first_name) <> ''
)
UPDATE public.profiles p
SET founding_number = missing.next_number
FROM missing
WHERE p.id = missing.id;