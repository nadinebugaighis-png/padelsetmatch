DROP INDEX IF EXISTS public.match_event_invites_event_invitee_unique;
DROP INDEX IF EXISTS public.match_event_invites_event_profile_uk;
ALTER TABLE public.match_event_invites
  ADD CONSTRAINT match_event_invites_event_invitee_key
  UNIQUE (match_event_id, invitee_profile_id);