-- extend delete to gear
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
  ELSIF _kind = 'gear' THEN
    DELETE FROM public.profile_gear WHERE id = _id;
  ELSIF _kind = 'photo' THEN
    UPDATE public.profiles
       SET photo_url = NULL,
           photo_moderation_status = 'rejected',
           photo_moderation_reason = 'admin_removed'
     WHERE id = _id;
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

-- proactive moderation feed
CREATE OR REPLACE FUNCTION public.admin_moderation_feed(_limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lim integer := LEAST(GREATEST(COALESCE(_limit, 40), 1), 100);
  _posts jsonb;
  _comments jsonb;
  _photos jsonb;
  _gear jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) INTO _posts
  FROM (
    SELECT jsonb_build_object('id', p.id, 'created_at', p.created_at, 'title', p.title,
      'body', p.body, 'author_profile_id', p.author_profile_id, 'author_name', pr.first_name) AS x
    FROM public.connect_posts p
    LEFT JOIN public.profiles pr ON pr.id = p.author_profile_id
    ORDER BY p.created_at DESC LIMIT _lim
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) INTO _comments
  FROM (
    SELECT jsonb_build_object('id', c.id, 'created_at', c.created_at, 'body', c.body,
      'author_profile_id', c.author_profile_id, 'author_name', pr.first_name) AS x
    FROM public.connect_comments c
    LEFT JOIN public.profiles pr ON pr.id = c.author_profile_id
    ORDER BY c.created_at DESC LIMIT _lim
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) INTO _photos
  FROM (
    SELECT jsonb_build_object('id', pr.id, 'created_at', pr.updated_at, 'first_name', pr.first_name,
      'photo_url', pr.photo_url, 'zone', pr.zone) AS x
    FROM public.profiles pr
    WHERE pr.photo_url IS NOT NULL AND COALESCE(pr.is_seed, false) = false
    ORDER BY pr.updated_at DESC LIMIT _lim
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) INTO _gear
  FROM (
    SELECT jsonb_build_object('id', g.id, 'created_at', g.created_at, 'title', g.title,
      'kind', g.kind, 'note', g.note, 'image_url', g.image_url,
      'profile_id', g.profile_id, 'author_name', pr.first_name) AS x
    FROM public.profile_gear g
    LEFT JOIN public.profiles pr ON pr.id = g.profile_id
    ORDER BY g.created_at DESC LIMIT _lim
  ) s;

  RETURN jsonb_build_object('posts', _posts, 'comments', _comments, 'photos', _photos, 'gear', _gear);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderation_feed(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderation_feed(integer) TO authenticated;