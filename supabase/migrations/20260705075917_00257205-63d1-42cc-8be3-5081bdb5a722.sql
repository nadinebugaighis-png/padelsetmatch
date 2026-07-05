
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT friendships_not_self CHECK (requester_profile_id <> addressee_profile_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_profile_id, addressee_profile_id)
);

CREATE INDEX idx_friendships_requester ON public.friendships(requester_profile_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- View: either party can see
CREATE POLICY "Users view their friendships"
ON public.friendships FOR SELECT
TO authenticated
USING (
  requester_profile_id = public.my_profile_id()
  OR addressee_profile_id = public.my_profile_id()
);

-- Create: only as requester, only pending
CREATE POLICY "Users send friend requests"
ON public.friendships FOR INSERT
TO authenticated
WITH CHECK (
  requester_profile_id = public.my_profile_id()
  AND status = 'pending'
);

-- Update: only the addressee can accept/decline (change status)
CREATE POLICY "Addressee responds to request"
ON public.friendships FOR UPDATE
TO authenticated
USING (addressee_profile_id = public.my_profile_id())
WITH CHECK (addressee_profile_id = public.my_profile_id());

-- Delete: either party can remove
CREATE POLICY "Either party removes friendship"
ON public.friendships FOR DELETE
TO authenticated
USING (
  requester_profile_id = public.my_profile_id()
  OR addressee_profile_id = public.my_profile_id()
);
