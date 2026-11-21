CREATE OR REPLACE FUNCTION public.is_competition_participant(_comp uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competition_entries e WHERE e.competition_id = _comp AND e.profile_id = public.my_profile_id())
$$;
REVOKE EXECUTE ON FUNCTION public.is_competition_participant(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_competition_participant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.competition_entry_counts(_ids uuid[]) RETURNS TABLE (competition_id uuid, entries integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.competition_id, count(*)::int FROM public.competition_entries e
  WHERE e.competition_id = ANY(_ids) AND auth.uid() IS NOT NULL
  GROUP BY e.competition_id
$$;
REVOKE EXECUTE ON FUNCTION public.competition_entry_counts(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.competition_entry_counts(uuid[]) TO authenticated;

DROP POLICY IF EXISTS "entry read" ON public.competition_entries;
CREATE POLICY "entry read" ON public.competition_entries FOR SELECT TO authenticated
  USING (
    profile_id = public.my_profile_id()
    OR public.is_current_user_admin()
    OR public.is_competition_participant(competition_id)
    OR EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.creator_profile_id = public.my_profile_id())
  );

DROP POLICY IF EXISTS "poster read" ON storage.objects;
CREATE POLICY "poster read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'competition-posters' AND (storage.foldername(name))[1] = auth.uid()::text);