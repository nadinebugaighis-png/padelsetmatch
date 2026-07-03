ALTER TABLE public.match_event_messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

GRANT UPDATE, DELETE ON public.match_event_messages TO authenticated;
GRANT ALL ON public.match_event_messages TO service_role;

CREATE POLICY "Senders can edit own event messages"
  ON public.match_event_messages FOR UPDATE
  TO authenticated
  USING (
    sender_profile_id = public.my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.match_event_participants p
      WHERE p.match_event_id = match_event_messages.match_event_id
        AND p.profile_id = public.my_profile_id()
    )
  )
  WITH CHECK (
    sender_profile_id = public.my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.match_event_participants p
      WHERE p.match_event_id = match_event_messages.match_event_id
        AND p.profile_id = public.my_profile_id()
    )
  );

CREATE POLICY "Senders can delete own event messages"
  ON public.match_event_messages FOR DELETE
  TO authenticated
  USING (
    sender_profile_id = public.my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.match_event_participants p
      WHERE p.match_event_id = match_event_messages.match_event_id
        AND p.profile_id = public.my_profile_id()
    )
  );