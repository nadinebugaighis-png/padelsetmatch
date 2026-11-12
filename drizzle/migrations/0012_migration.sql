CREATE OR REPLACE FUNCTION public.upsert_compat_score(_other uuid, _score integer, _blurb text, _reasons jsonb, _friction text, _sub jsonb, _version text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_me uuid; v_a uuid; v_b uuid; v_reasons text[];
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF v_me = _other THEN RAISE EXCEPTION 'cannot score self'; END IF;
  IF v_me < _other THEN v_a := v_me; v_b := _other; ELSE v_a := _other; v_b := v_me; END IF;
  SELECT COALESCE(array_agg(x), '{}'::text[]) INTO v_reasons
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(_reasons) = 'array' THEN _reasons ELSE '[]'::jsonb END) AS x;
  INSERT INTO public.compatibility_scores(profile_a, profile_b, score, blurb, reasons, friction, sub_scores, model_version)
  VALUES (v_a, v_b, _score, _blurb, v_reasons, _friction, _sub, _version)
  ON CONFLICT (profile_a, profile_b) DO UPDATE
  SET score = EXCLUDED.score,
      blurb = EXCLUDED.blurb,
      reasons = EXCLUDED.reasons,
      friction = EXCLUDED.friction,
      sub_scores = EXCLUDED.sub_scores,
      model_version = EXCLUDED.model_version,
      created_at = now();
END$function$;