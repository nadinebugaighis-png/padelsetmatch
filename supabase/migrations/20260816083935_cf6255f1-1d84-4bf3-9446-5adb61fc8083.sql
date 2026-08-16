-- 1. Stop posts from expiring.
ALTER TABLE public.connect_posts
  ALTER COLUMN expires_at DROP NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT NULL;

UPDATE public.connect_posts SET expires_at = NULL;

-- 2. Keep posts/comments when the author deletes their account.
ALTER TABLE public.connect_posts
  DROP CONSTRAINT IF EXISTS connect_posts_author_profile_id_fkey;

ALTER TABLE public.connect_posts
  ADD CONSTRAINT connect_posts_author_profile_id_fkey
  FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.connect_comments
  DROP CONSTRAINT IF EXISTS connect_comments_author_profile_id_fkey;

ALTER TABLE public.connect_comments
  ADD CONSTRAINT connect_comments_author_profile_id_fkey
  FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Update visibility policies so posts/comments are visible regardless of
--    expiration or whether the author's account still exists.
DROP POLICY IF EXISTS "Authenticated can view active posts" ON public.connect_posts;

CREATE POLICY "Authenticated can view posts"
  ON public.connect_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can view comments on active posts" ON public.connect_comments;

CREATE POLICY "Authenticated can view comments"
  ON public.connect_comments FOR SELECT
  TO authenticated
  USING (true);
