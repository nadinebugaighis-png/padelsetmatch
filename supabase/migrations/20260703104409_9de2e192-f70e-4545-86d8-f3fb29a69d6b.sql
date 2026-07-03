
-- 1) Add onboarding_stage
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_stage text NOT NULL DEFAULT 'none';

-- 2) Relax NOT NULL on fields not needed for lite profiles
ALTER TABLE public.profiles ALTER COLUMN age DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN nationality DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN zone DROP NOT NULL;

-- 3) Backfill onboarding_stage based on existing data
UPDATE public.profiles
   SET onboarding_stage = CASE
     WHEN photo_url IS NOT NULL AND array_length(priorities, 1) >= 3 THEN 'complete'
     WHEN first_name IS NOT NULL AND level IS NOT NULL THEN 'lite'
     ELSE 'none'
   END
 WHERE onboarding_stage = 'none';

-- 4) Public read RPC: returns whitelisted match + host + participants (name only) for one match
CREATE OR REPLACE FUNCTION public.public_match_view(_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', me.id,
    'starts_at', me.starts_at,
    'club_name', me.club_name,
    'club_address', me.club_address,
    'city', me.city,
    'country', me.country,
    'gender_rule', me.gender_rule,
    'level_min', me.level_min,
    'level_max', me.level_max,
    'note', me.note,
    'court_booked', me.court_booked,
    'status', me.status,
    'extra_confirmed', me.extra_confirmed,
    'filled', COALESCE((SELECT count(*) FROM public.match_event_participants p WHERE p.match_event_id = me.id), 0) + COALESCE(me.extra_confirmed, 0),
    'host', (SELECT jsonb_build_object('first_name', pr.first_name) FROM public.profiles pr WHERE pr.id = me.host_profile_id),
    'participant_names', COALESCE((
      SELECT jsonb_agg(pr.first_name ORDER BY p.joined_at)
      FROM public.match_event_participants p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE p.match_event_id = me.id
    ), '[]'::jsonb)
  )
  FROM public.match_events me
  WHERE me.id = _event_id
    AND me.status IN ('open', 'full')
    AND me.starts_at > now() - interval '2 hours';
$$;

REVOKE ALL ON FUNCTION public.public_match_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_match_view(uuid) TO anon, authenticated;
