-- Admin: fetch the actual content behind a content report
CREATE OR REPLACE FUNCTION public.admin_get_reported_content(_kind text, _id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  IF _kind = 'post' THEN
    SELECT jsonb_build_object(
      'kind', 'post', 'id', p.id, 'body', p.title || E'\n' || p.body,
      'created_at', p.created_at, 'author_profile_id', p.author_profile_id,
      'author_name', pr.first_name, 'exists', true
    ) INTO _row
    FROM public.connect_posts p
    LEFT JOIN public.profiles pr ON pr.id = p.author_profile_id
    WHERE p.id = _id;
  ELSIF _kind = 'comment' THEN
    SELECT jsonb_build_object(
      'kind', 'comment', 'id', c.id, 'body', c.body,
      'created_at', c.created_at, 'author_profile_id', c.author_profile_id,
      'author_name', pr.first_name, 'exists', true
    ) INTO _row
    FROM public.connect_comments c
    LEFT JOIN public.profiles pr ON pr.id = c.author_profile_id
    WHERE c.id = _id;
  ELSIF _kind = 'message' THEN
    SELECT jsonb_build_object(
      'kind', 'message', 'id', m.id, 'body', m.body,
      'created_at', m.created_at, 'author_profile_id', m.sender_profile_id,
      'author_name', pr.first_name, 'exists', true
    ) INTO _row
    FROM public.messages m
    LEFT JOIN public.profiles pr ON pr.id = m.sender_profile_id
    WHERE m.id = _id;
  ELSE
    RAISE EXCEPTION 'unknown kind';
  END IF;

  RETURN COALESCE(_row, jsonb_build_object('kind', _kind, 'id', _id, 'exists', false));
END;
$$;

-- Admin: delete reported content
CREATE OR REPLACE FUNCTION public.admin_delete_content(_kind text, _id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  IF _kind = 'post' THEN
    DELETE FROM public.connect_posts WHERE id = _id;
  ELSIF _kind = 'comment' THEN
    DELETE FROM public.connect_comments WHERE id = _id;
  ELSIF _kind = 'message' THEN
    UPDATE public.messages
       SET body = '[removed by moderator]', deleted_at = now()
     WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'unknown kind';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_reported_content(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_content(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_reported_content(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_content(text, uuid) TO authenticated;