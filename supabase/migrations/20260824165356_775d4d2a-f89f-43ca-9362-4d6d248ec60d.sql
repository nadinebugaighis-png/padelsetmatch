-- Gate the Connect social feed to profiles with a declared adult age (18+).
-- profiles.age has a CHECK (age >= 18 AND age <= 99), so a non-null age is
-- always an adult age; NULL means onboarding was never completed.

CREATE OR REPLACE FUNCTION public.current_user_is_adult()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND age IS NOT NULL
  )
$$;

-- connect_posts: only adult profiles can read or write
DROP POLICY IF EXISTS "Authenticated can view posts" ON public.connect_posts;
CREATE POLICY "Authenticated can view posts" ON public.connect_posts FOR SELECT TO authenticated
USING (public.current_user_is_adult());

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.connect_posts;
CREATE POLICY "Users can insert their own posts" ON public.connect_posts FOR INSERT TO authenticated
WITH CHECK (author_profile_id = public.my_profile_id() AND public.current_user_is_adult());

DROP POLICY IF EXISTS "Users can update their own posts" ON public.connect_posts;
CREATE POLICY "Users can update their own posts" ON public.connect_posts FOR UPDATE TO authenticated
USING (author_profile_id = public.my_profile_id() AND public.current_user_is_adult())
WITH CHECK (author_profile_id = public.my_profile_id() AND public.current_user_is_adult());

-- connect_comments: same gate
DROP POLICY IF EXISTS "Authenticated can view comments" ON public.connect_comments;
CREATE POLICY "Authenticated can view comments" ON public.connect_comments FOR SELECT TO authenticated
USING (public.current_user_is_adult());

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.connect_comments;
CREATE POLICY "Users can insert their own comments" ON public.connect_comments FOR INSERT TO authenticated
WITH CHECK (author_profile_id = public.my_profile_id() AND public.current_user_is_adult());

DROP POLICY IF EXISTS "Users can update their own comments" ON public.connect_comments;
CREATE POLICY "Users can update their own comments" ON public.connect_comments FOR UPDATE TO authenticated
USING (author_profile_id = public.my_profile_id() AND public.current_user_is_adult())
WITH CHECK (author_profile_id = public.my_profile_id() AND public.current_user_is_adult());