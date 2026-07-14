
CREATE OR REPLACE FUNCTION public.get_signup_ordinal(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM auth.users u
  WHERE u.created_at <= (SELECT created_at FROM auth.users WHERE id = _user_id);
$$;

REVOKE ALL ON FUNCTION public.get_signup_ordinal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_ordinal(uuid) TO authenticated;
