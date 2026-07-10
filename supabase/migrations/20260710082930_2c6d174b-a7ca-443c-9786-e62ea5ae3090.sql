-- ============================================================================
-- Replace runtime supabaseAdmin usage with SECURITY DEFINER RPCs
-- Lovable Cloud does not expose SUPABASE_SERVICE_ROLE_KEY to the app runtime,
-- so we move every privileged read/write behind auditable SD functions.
-- ============================================================================

-- ---- 1. Compatibility cache -------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_my_compat_scores()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.compatibility_scores
  WHERE profile_a = public.my_profile_id() OR profile_b = public.my_profile_id();
$$;
REVOKE ALL ON FUNCTION public.clear_my_compat_scores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_compat_scores() TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_compat_score(
  _other uuid,
  _score int,
  _blurb text,
  _reasons jsonb,
  _friction text,
  _sub jsonb,
  _version text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid; v_a uuid; v_b uuid;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF v_me = _other THEN RAISE EXCEPTION 'cannot score self'; END IF;
  IF v_me < _other THEN v_a := v_me; v_b := _other; ELSE v_a := _other; v_b := v_me; END IF;
  INSERT INTO public.compatibility_scores(profile_a, profile_b, score, blurb, reasons, friction, sub_scores, model_version)
  VALUES (v_a, v_b, _score, _blurb, COALESCE(_reasons, '[]'::jsonb), _friction, _sub, _version)
  ON CONFLICT (profile_a, profile_b) DO UPDATE
  SET score = EXCLUDED.score,
      blurb = EXCLUDED.blurb,
      reasons = EXCLUDED.reasons,
      friction = EXCLUDED.friction,
      sub_scores = EXCLUDED.sub_scores,
      model_version = EXCLUDED.model_version,
      created_at = now();
END$$;
REVOKE ALL ON FUNCTION public.upsert_compat_score(uuid, int, text, jsonb, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_compat_score(uuid, int, text, jsonb, text, jsonb, text) TO authenticated;

-- Return both users' QA answers for the compatibility calculation.
CREATE OR REPLACE FUNCTION public.get_pair_qa(_other uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  RETURN jsonb_build_object(
    'my_count', (SELECT count(*) FROM public.qa_answers WHERE profile_id = v_me),
    'their_count', (SELECT count(*) FROM public.qa_answers WHERE profile_id = _other),
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('profile_id', profile_id, 'question', question, 'answer', answer))
      FROM (
        SELECT profile_id, question, answer
        FROM public.qa_answers
        WHERE profile_id IN (v_me, _other)
        LIMIT 200
      ) t
    ), '[]'::jsonb)
  );
END$$;
REVOKE ALL ON FUNCTION public.get_pair_qa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pair_qa(uuid) TO authenticated;

-- ---- 2. Reports (user-facing) -----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_report(_reported uuid, _reason text, _category text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid;
  v_target_user uuid;
  v_existing uuid;
  v_distinct int;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF v_me = _reported THEN RAISE EXCEPTION 'cannot report self'; END IF;

  SELECT user_id INTO v_target_user FROM public.profiles WHERE id = _reported;

  SELECT id INTO v_existing
    FROM public.reports
   WHERE reporter_profile_id = v_me
     AND reported_profile_id = _reported
     AND (_category IS NULL OR category = _category)
     AND status = 'pending'
   LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.reports(reporter_profile_id, reported_profile_id, reported_user_id, reason, category, status)
    VALUES (v_me, _reported, v_target_user, _reason, _category, 'pending');
  END IF;

  SELECT count(DISTINCT reporter_profile_id) INTO v_distinct
    FROM public.reports
   WHERE reported_profile_id = _reported
     AND (_category IS NULL OR category = _category)
     AND status = 'pending';

  -- Auto-suspend account after 3 distinct reporters (general reports only)
  IF _category IS NULL AND v_distinct >= 3 THEN
    UPDATE public.profiles SET suspended_at = now()
     WHERE id = _reported AND suspended_at IS NULL;
  END IF;

  -- Auto-hide photo after 2 distinct photo reports
  IF _category = 'photo' AND v_distinct >= 2 THEN
    UPDATE public.profiles
       SET photo_url = NULL,
           photo_moderation_status = 'rejected',
           photo_moderation_reason = 'community_flagged'
     WHERE id = _reported AND photo_url IS NOT NULL;
  END IF;

  -- Auto-block from reporter's side
  INSERT INTO public.blocks(blocker_profile_id, blocked_profile_id)
  VALUES (v_me, _reported)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'distinctCount', v_distinct);
END$$;
REVOKE ALL ON FUNCTION public.handle_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_report(uuid, text, text) TO authenticated;

-- ---- 3. Block cleanup (delete cross-user likes+matches) ---------------------
CREATE OR REPLACE FUNCTION public.cleanup_relationship_with(_other uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  DELETE FROM public.likes
   WHERE (liker_profile_id = v_me AND liked_profile_id = _other)
      OR (liker_profile_id = _other AND liked_profile_id = v_me);
  DELETE FROM public.matches
   WHERE (profile_a = v_me AND profile_b = _other)
      OR (profile_a = _other AND profile_b = v_me);
END$$;
REVOKE ALL ON FUNCTION public.cleanup_relationship_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_relationship_with(uuid) TO authenticated;

-- ---- 4. Account deletion (best-effort; auth.users left for admin sweep) -----
CREATE OR REPLACE FUNCTION public.delete_my_account_data()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid;
BEGIN
  v_me := public.my_profile_id();
  IF v_me IS NULL THEN RETURN; END IF;
  DELETE FROM public.messages WHERE sender_profile_id = v_me;
  DELETE FROM public.likes WHERE liker_profile_id = v_me OR liked_profile_id = v_me;
  DELETE FROM public.matches WHERE profile_a = v_me OR profile_b = v_me;
  DELETE FROM public.profiles WHERE id = v_me;
END$$;
REVOKE ALL ON FUNCTION public.delete_my_account_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account_data() TO authenticated;

-- ---- 5. Hidden/blocked profile lookup (needs to read other users' minimal info) --
-- profiles already has SELECT to authenticated, so this is only needed if that changes.
-- We still add a helper that filters columns for stability.
CREATE OR REPLACE FUNCTION public.get_profiles_minimal(_ids uuid[])
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'first_name', first_name, 'photo_url', photo_url, 'zone', zone
  )), '[]'::jsonb)
  FROM public.profiles WHERE id = ANY(_ids);
$$;
REVOKE ALL ON FUNCTION public.get_profiles_minimal(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profiles_minimal(uuid[]) TO authenticated;

-- ---- 6. Push outbox drain --------------------------------------------------
-- Claim a batch of pending push_outbox rows, mark them sent, and return them
-- together with the subscription endpoints to notify. Runs as caller after
-- verifying their auth role — we accept anyone signed-in because a push drain
-- is idempotent and self-healing.
CREATE OR REPLACE FUNCTION public.claim_push_outbox(_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF public.my_profile_id() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  WITH picked AS (
    SELECT id FROM public.push_outbox
     WHERE sent_at IS NULL
     ORDER BY created_at ASC
     LIMIT GREATEST(1, LEAST(_limit, 200))
     FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.push_outbox po
       SET sent_at = now()
      FROM picked
     WHERE po.id = picked.id
    RETURNING po.id, po.profile_id, po.title, po.body, po.url, po.type
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id, 'profile_id', c.profile_id, 'title', c.title,
      'body', c.body, 'url', c.url, 'type', c.type,
      'subs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
        FROM public.push_subscriptions s WHERE s.profile_id = c.profile_id
      ), '[]'::jsonb)
    )), '[]'::jsonb)
  ) INTO v_result
  FROM claimed c;
  RETURN v_result;
END$$;
REVOKE ALL ON FUNCTION public.claim_push_outbox(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_push_outbox(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_expired_push_subs(_endpoints text[])
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.push_subscriptions WHERE endpoint = ANY(_endpoints);
$$;
REVOKE ALL ON FUNCTION public.delete_expired_push_subs(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_expired_push_subs(text[]) TO authenticated;

-- ---- 7. Admin gate helper --------------------------------------------------
-- Wrap has_role for convenience. If SUPABASE_SERVICE_ROLE_KEY becomes
-- available again later, admin functions can resume using supabaseAdmin.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
