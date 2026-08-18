-- Participants: visible to any signed-in user for non-cancelled events
DROP POLICY IF EXISTS "Participants and host can view participants" ON public.match_event_participants;
CREATE POLICY "Signed-in users can view match participants"
ON public.match_event_participants FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.match_events me WHERE me.id = match_event_id AND (me.status <> 'cancelled' OR me.host_profile_id = public.my_profile_id())));

-- Guests: visible to any signed-in user, but only non-sensitive columns
DROP POLICY IF EXISTS "Event participants can view guests" ON public.guest_participants;
CREATE POLICY "Signed-in users can view match guests"
ON public.guest_participants FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.match_events me WHERE me.id = match_event_id AND (me.status <> 'cancelled' OR me.host_profile_id = public.my_profile_id())));

REVOKE SELECT ON public.guest_participants FROM authenticated;
GRANT SELECT (id, match_event_id, display_name, level, invited_by_profile_id, created_at) ON public.guest_participants TO authenticated;
