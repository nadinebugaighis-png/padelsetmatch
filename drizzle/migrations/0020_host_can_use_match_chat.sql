DROP POLICY IF EXISTS "Participants can send messages" ON public.match_event_messages;
CREATE POLICY "Participants can send messages" ON public.match_event_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_profile_id = public.my_profile_id() AND (
    EXISTS (SELECT 1 FROM public.match_event_participants p WHERE p.match_event_id = match_event_messages.match_event_id AND p.profile_id = public.my_profile_id())
    OR EXISTS (SELECT 1 FROM public.match_events me WHERE me.id = match_event_messages.match_event_id AND me.host_profile_id = public.my_profile_id())
  )
);

DROP POLICY IF EXISTS "Participants can read messages" ON public.match_event_messages;
CREATE POLICY "Participants can read messages" ON public.match_event_messages
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.match_event_participants p WHERE p.match_event_id = match_event_messages.match_event_id AND p.profile_id = public.my_profile_id())
  OR EXISTS (SELECT 1 FROM public.match_events me WHERE me.id = match_event_messages.match_event_id AND me.host_profile_id = public.my_profile_id())
);

DROP POLICY IF EXISTS "Senders can edit own event messages" ON public.match_event_messages;
CREATE POLICY "Senders can edit own event messages" ON public.match_event_messages
FOR UPDATE TO authenticated
USING (
  sender_profile_id = public.my_profile_id() AND (
    EXISTS (SELECT 1 FROM public.match_event_participants p WHERE p.match_event_id = match_event_messages.match_event_id AND p.profile_id = public.my_profile_id())
    OR EXISTS (SELECT 1 FROM public.match_events me WHERE me.id = match_event_messages.match_event_id AND me.host_profile_id = public.my_profile_id())
  )
)
WITH CHECK (
  sender_profile_id = public.my_profile_id() AND (
    EXISTS (SELECT 1 FROM public.match_event_participants p WHERE p.match_event_id = match_event_messages.match_event_id AND p.profile_id = public.my_profile_id())
    OR EXISTS (SELECT 1 FROM public.match_events me WHERE me.id = match_event_messages.match_event_id AND me.host_profile_id = public.my_profile_id())
  )
);