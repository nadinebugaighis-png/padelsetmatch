CREATE OR REPLACE FUNCTION public.current_user_is_adult()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND age IS NOT NULL
      AND age >= 18
  )
$function$;