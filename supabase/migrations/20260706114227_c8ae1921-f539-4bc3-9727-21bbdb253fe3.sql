
-- Tighten profiles SELECT: own row full, others only if not suspended
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can view other active profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (suspended_at IS NULL AND user_id <> auth.uid());

-- Tighten match_event_participants SELECT: only co-participants or host
DROP POLICY IF EXISTS "Signed-in users can view participants" ON public.match_event_participants;
CREATE POLICY "Participants and host can view participants"
  ON public.match_event_participants FOR SELECT TO authenticated
  USING (
    profile_id = public.my_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.match_event_participants p2
      WHERE p2.match_event_id = match_event_participants.match_event_id
        AND p2.profile_id = public.my_profile_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.match_events me
      WHERE me.id = match_event_participants.match_event_id
        AND me.host_profile_id = public.my_profile_id()
    )
  );

-- user_roles: explicitly deny client-side writes; only service_role/admin paths may modify
CREATE POLICY "No client inserts on user_roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "No client updates on user_roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on user_roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (false);
