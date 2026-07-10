
-- Reports: explicit admin-only UPDATE/DELETE (no user policies exist, so this is defense-in-depth)
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Feedback: tighten INSERT so profile_id must belong to the auth user
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='feedback' AND cmd='INSERT' LOOP
    EXECUTE format('DROP POLICY %I ON public.feedback', p.policyname);
  END LOOP;
END$$;

CREATE POLICY "Users can submit their own feedback"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      profile_id IS NULL
      OR profile_id = public.my_profile_id()
    )
  );
