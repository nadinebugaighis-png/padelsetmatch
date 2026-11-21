DROP POLICY IF EXISTS "gear_select_authenticated" ON public.profile_gear;
CREATE POLICY "gear_select_visible_profiles" ON public.profile_gear
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND (p.user_id = auth.uid() OR p.suspended_at IS NULL)));