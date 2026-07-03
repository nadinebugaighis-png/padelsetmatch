
-- Allow reporters to view their own reports
CREATE POLICY "Reporters can view their own reports"
ON public.reports FOR SELECT
TO authenticated
USING (reporter_profile_id = public.my_profile_id());

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Revoke EXECUTE from authenticated/anon on SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_played_confirmation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_no_show() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_match_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_host_as_participant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_match_event_full() FROM PUBLIC, anon, authenticated;
