
CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid, _profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.match_event_participants WHERE match_event_id = _event_id AND profile_id = _profile_id)
$$;

DROP POLICY IF EXISTS "Participants and host can view participants" ON public.match_event_participants;

CREATE POLICY "Participants and host can view participants"
ON public.match_event_participants
FOR SELECT
USING (
  profile_id = my_profile_id()
  OR public.is_event_participant(match_event_id, my_profile_id())
  OR EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_participants.match_event_id
      AND me.host_profile_id = my_profile_id()
  )
);
