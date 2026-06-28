
-- Make my_profile_id run as the caller (it only needs to read the caller's own profile via RLS)
CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- handle_new_like is trigger-only; revoke EXECUTE from app roles
REVOKE EXECUTE ON FUNCTION public.handle_new_like() FROM PUBLIC, anon, authenticated;
