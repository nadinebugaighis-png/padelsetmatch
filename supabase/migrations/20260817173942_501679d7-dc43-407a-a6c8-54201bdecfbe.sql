CREATE POLICY "Host or admin can delete event messages"
ON public.match_event_messages
FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_messages.match_event_id
      AND me.host_profile_id = public.my_profile_id()
  )
);