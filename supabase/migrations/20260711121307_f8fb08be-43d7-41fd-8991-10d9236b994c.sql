CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_signups jsonb;
  v_recent_feedback jsonb;
  v_recent_reports jsonb;
  v_counts jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'signed_up_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed', u.email_confirmed_at IS NOT NULL,
    'profile_completed', p.id IS NOT NULL AND p.onboarding_stage IS DISTINCT FROM 'lite',
    'onboarding_stage', p.onboarding_stage,
    'first_name', p.first_name,
    'age', p.age,
    'zone', p.zone,
    'suspended', p.suspended_at IS NOT NULL
  ) ORDER BY u.created_at DESC), '[]'::jsonb)
  INTO v_all_signups
  FROM (
    SELECT id, email, created_at, last_sign_in_at, email_confirmed_at
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1000
  ) u
  LEFT JOIN public.profiles p ON p.user_id = u.id AND COALESCE(p.is_seed, false) = false;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'rating', f.rating,
    'message', f.message,
    'created_at', f.created_at
  ) ORDER BY f.created_at DESC), '[]'::jsonb)
  INTO v_recent_feedback
  FROM (
    SELECT id, rating, message, created_at
    FROM public.feedback
    ORDER BY created_at DESC
    LIMIT 20
  ) f;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'reporter_profile_id', r.reporter_profile_id,
    'reported_profile_id', r.reported_profile_id,
    'reason', r.reason,
    'category', r.category,
    'status', r.status,
    'created_at', r.created_at,
    'reporter_name', reporter.first_name,
    'reported_name', reported.first_name,
    'reported_photo_url', reported.photo_url,
    'reported_suspended', reported.suspended_at IS NOT NULL
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_recent_reports
  FROM (
    SELECT id, reporter_profile_id, reported_profile_id, reason, category, status, created_at
    FROM public.reports
    ORDER BY created_at DESC
    LIMIT 50
  ) r
  LEFT JOIN public.profiles reporter ON reporter.id = r.reporter_profile_id
  LEFT JOIN public.profiles reported ON reported.id = r.reported_profile_id;

  SELECT jsonb_build_object(
    'users', (SELECT count(*)::int FROM public.profiles WHERE COALESCE(is_seed, false) = false),
    'signups', jsonb_array_length(v_all_signups),
    'incomplete', (
      SELECT count(*)::int
      FROM jsonb_to_recordset(v_all_signups) AS s(profile_completed boolean)
      WHERE COALESCE(s.profile_completed, false) = false
    ),
    'matches', (SELECT count(*)::int FROM public.matches),
    'likes', (SELECT count(*)::int FROM public.likes),
    'feedback', (SELECT count(*)::int FROM public.feedback),
    'reports', (SELECT count(*)::int FROM public.reports WHERE status = 'pending')
  ) INTO v_counts;

  RETURN jsonb_build_object(
    'counts', v_counts,
    'allSignups', v_all_signups,
    'recentFeedback', v_recent_feedback,
    'recentReports', v_recent_reports
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(_report_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report record;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _status NOT IN ('resolved', 'dismissed', 'pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT reporter_profile_id, reported_profile_id
  INTO v_report
  FROM public.reports
  WHERE id = _report_id;

  UPDATE public.reports
  SET status = _status,
      reviewed_at = now()
  WHERE id = _report_id;

  IF FOUND AND _status IN ('resolved', 'dismissed') AND v_report.reporter_profile_id IS NOT NULL THEN
    DELETE FROM public.blocks
    WHERE blocker_profile_id = v_report.reporter_profile_id
      AND blocked_profile_id = v_report.reported_profile_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_profile_photo(_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles
  SET photo_url = NULL,
      photo_moderation_status = 'rejected',
      photo_moderation_reason = 'admin_removed'
  WHERE id = _profile_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_profile_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_clear_profile_photo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_suspended(_profile_id uuid, _suspend boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles
  SET suspended_at = CASE WHEN _suspend THEN now() ELSE NULL END
  WHERE id = _profile_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;