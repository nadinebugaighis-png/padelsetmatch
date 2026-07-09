
DO $$ BEGIN
  CREATE TYPE public.venue_type AS ENUM ('club', 'compound', 'public_court', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL,
  city text,
  country text,
  venue_type public.venue_type NOT NULL DEFAULT 'other',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX venues_unique_key
  ON public.venues (normalized_name, COALESCE(city, ''), COALESCE(country, ''));

GRANT SELECT, INSERT, UPDATE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read venues"
  ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add venues"
  ON public.venues FOR INSERT TO authenticated
  WITH CHECK (created_by = public.my_profile_id());
CREATE POLICY "Creator can edit their venue"
  ON public.venues FOR UPDATE TO authenticated
  USING (created_by = public.my_profile_id())
  WITH CHECK (created_by = public.my_profile_id());

CREATE TRIGGER venues_set_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX venues_normalized_name_idx ON public.venues (normalized_name);
CREATE INDEX venues_city_idx ON public.venues (city);

CREATE TABLE public.profile_venues (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, venue_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_venues TO authenticated;
GRANT ALL ON public.profile_venues TO service_role;

ALTER TABLE public.profile_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own venue links"
  ON public.profile_venues FOR ALL TO authenticated
  USING (profile_id = public.my_profile_id())
  WITH CHECK (profile_id = public.my_profile_id());

CREATE INDEX profile_venues_venue_idx ON public.profile_venues (venue_id);
CREATE INDEX profile_venues_profile_idx ON public.profile_venues (profile_id);

CREATE OR REPLACE FUNCTION public.shared_venues(_a uuid, _b uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH shared AS (
    SELECT v.id, v.name, v.venue_type,
           pa.is_public AS a_public, pb.is_public AS b_public
    FROM public.profile_venues pa
    JOIN public.profile_venues pb ON pb.venue_id = pa.venue_id
    JOIN public.venues v ON v.id = pa.venue_id
    WHERE pa.profile_id = _a AND pb.profile_id = _b
  )
  SELECT jsonb_build_object(
    'count', COALESCE(count(*), 0),
    'names', COALESCE(jsonb_agg(name) FILTER (WHERE a_public AND b_public), '[]'::jsonb)
  )
  FROM shared;
$$;

REVOKE ALL ON FUNCTION public.shared_venues(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shared_venues(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.shared_venues(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.shared_venues(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.venue_overlap_for_me(_profile_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT venue_id FROM public.profile_venues WHERE profile_id = public.my_profile_id()
  ),
  overlap AS (
    SELECT pv.profile_id, count(*)::int AS shared_count
    FROM public.profile_venues pv
    JOIN me ON me.venue_id = pv.venue_id
    WHERE pv.profile_id = ANY(_profile_ids)
    GROUP BY pv.profile_id
  )
  SELECT COALESCE(jsonb_object_agg(profile_id, shared_count), '{}'::jsonb)
  FROM overlap;
$$;

REVOKE ALL ON FUNCTION public.venue_overlap_for_me(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.venue_overlap_for_me(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.venue_overlap_for_me(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.venue_overlap_for_me(uuid[]) TO service_role;
