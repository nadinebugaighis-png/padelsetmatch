ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS friend_interested_in TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS partner_interested_in TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.profiles SET friend_interested_in = interested_in WHERE array_length(friend_interested_in,1) IS NULL;
UPDATE public.profiles SET partner_interested_in = interested_in WHERE array_length(partner_interested_in,1) IS NULL;