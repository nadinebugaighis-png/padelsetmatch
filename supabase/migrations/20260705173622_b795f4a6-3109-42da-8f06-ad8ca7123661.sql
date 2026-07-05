
-- Invite status enum
DO $$ BEGIN
  CREATE TYPE public.match_invite_status AS ENUM ('pending','accepted','declined','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add priority window column to match_events
ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS invite_lock_until timestamptz;

-- Invites table
CREATE TABLE IF NOT EXISTS public.match_event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_event_id uuid NOT NULL REFERENCES public.match_events(id) ON DELETE CASCADE,
  inviter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text UNIQUE,
  status public.match_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT invite_has_target CHECK (invitee_profile_id IS NOT NULL OR token IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS match_event_invites_event_profile_uk
  ON public.match_event_invites (match_event_id, invitee_profile_id)
  WHERE invitee_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mei_event ON public.match_event_invites (match_event_id);
CREATE INDEX IF NOT EXISTS idx_mei_invitee ON public.match_event_invites (invitee_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_event_invites TO authenticated;
GRANT ALL ON public.match_event_invites TO service_role;

ALTER TABLE public.match_event_invites ENABLE ROW LEVEL SECURITY;

-- Host of the event or the invitee can see
CREATE POLICY "View invites as host or invitee" ON public.match_event_invites
FOR SELECT TO authenticated
USING (
  invitee_profile_id = public.my_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_invites.match_event_id
      AND me.host_profile_id = public.my_profile_id()
  )
);

-- Host can create invites for their own event
CREATE POLICY "Host inserts invites" ON public.match_event_invites
FOR INSERT TO authenticated
WITH CHECK (
  inviter_profile_id = public.my_profile_id()
  AND EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_invites.match_event_id
      AND me.host_profile_id = public.my_profile_id()
  )
);

-- Invitee can respond; host can revoke
CREATE POLICY "Invitee or host updates invite" ON public.match_event_invites
FOR UPDATE TO authenticated
USING (
  invitee_profile_id = public.my_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_invites.match_event_id
      AND me.host_profile_id = public.my_profile_id()
  )
)
WITH CHECK (
  invitee_profile_id = public.my_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_invites.match_event_id
      AND me.host_profile_id = public.my_profile_id()
  )
);

CREATE POLICY "Host deletes invites" ON public.match_event_invites
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.match_events me
    WHERE me.id = match_event_invites.match_event_id
      AND me.host_profile_id = public.my_profile_id()
  )
);

CREATE TRIGGER trg_mei_updated
BEFORE UPDATE ON public.match_event_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
