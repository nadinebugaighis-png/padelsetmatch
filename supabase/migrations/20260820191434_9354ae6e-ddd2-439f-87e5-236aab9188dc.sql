DROP POLICY IF EXISTS "Users or admins can delete posts" ON public.connect_posts;
CREATE POLICY "Users or admins can delete posts" ON public.connect_posts FOR DELETE TO authenticated
USING ((author_profile_id = public.my_profile_id()) OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Users or admins can delete comments" ON public.connect_comments;
CREATE POLICY "Users or admins can delete comments" ON public.connect_comments FOR DELETE TO authenticated
USING ((author_profile_id = public.my_profile_id()) OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated
USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports" ON public.reports FOR DELETE TO authenticated
USING (public.is_current_user_admin());