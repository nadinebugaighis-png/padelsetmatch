-- No-show reports: only a participant of an accepted connection can report the other side.
DROP POLICY IF EXISTS "Reporter can insert no-show" ON public.no_shows;
DROP POLICY IF EXISTS "Participant can report the other side" ON public.no_shows;
CREATE POLICY "Participant can report the other side" ON public.no_shows
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_profile_id = public.my_profile_id()
    AND reported_profile_id <> reporter_profile_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = no_shows.match_id
        AND m.accepted_at IS NOT NULL
        AND (
          (m.profile_a = no_shows.reporter_profile_id AND m.profile_b = no_shows.reported_profile_id)
          OR (m.profile_b = no_shows.reporter_profile_id AND m.profile_a = no_shows.reported_profile_id)
        )
    )
  );

-- Suspension needs three different reporters, not three rows.
CREATE OR REPLACE FUNCTION public.handle_no_show()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  SELECT count(DISTINCT reporter_profile_id) INTO v_count
    FROM public.no_shows WHERE reported_profile_id = NEW.reported_profile_id;
  UPDATE public.profiles
     SET no_show_count = v_count,
         suspended_at = CASE WHEN v_count >= 3 THEN COALESCE(suspended_at, now()) ELSE suspended_at END
   WHERE id = NEW.reported_profile_id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_no_show() FROM PUBLIC, anon, authenticated;

-- Compatibility scores are written only by the server after it computes them.
DROP FUNCTION IF EXISTS public.upsert_compat_score(uuid, integer, text, jsonb, text, jsonb, text);
CREATE OR REPLACE FUNCTION public.save_compat_score(_me uuid, _other uuid, _score integer, _blurb text, _reasons jsonb, _friction text, _sub jsonb, _version text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_a uuid; v_b uuid; v_reasons text[];
BEGIN
  IF _me IS NULL OR _other IS NULL OR _me = _other THEN RAISE EXCEPTION 'invalid pair'; END IF;
  IF _me < _other THEN v_a := _me; v_b := _other; ELSE v_a := _other; v_b := _me; END IF;
  SELECT COALESCE(array_agg(x), '{}'::text[]) INTO v_reasons
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(_reasons) = 'array' THEN _reasons ELSE '[]'::jsonb END) AS x;
  INSERT INTO public.compatibility_scores(profile_a, profile_b, score, blurb, reasons, friction, sub_scores, model_version)
  VALUES (v_a, v_b, GREATEST(0, LEAST(100, _score)), _blurb, v_reasons, _friction, _sub, _version)
  ON CONFLICT (profile_a, profile_b) DO UPDATE
  SET score = EXCLUDED.score,
      blurb = EXCLUDED.blurb,
      reasons = EXCLUDED.reasons,
      friction = EXCLUDED.friction,
      sub_scores = EXCLUDED.sub_scores,
      model_version = EXCLUDED.model_version,
      created_at = now();
END$function$;
REVOKE ALL ON FUNCTION public.save_compat_score(uuid, uuid, integer, text, jsonb, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_compat_score(uuid, uuid, integer, text, jsonb, text, jsonb, text) TO service_role;