-- Category enum for Connect posts
CREATE TYPE public.connect_category AS ENUM ('traveling', 'selling', 'looking_to_play', 'question', 'news', 'other');

-- Posts table
CREATE TABLE public.connect_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category public.connect_category NOT NULL DEFAULT 'other',
  city TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX connect_posts_active_idx ON public.connect_posts (expires_at DESC, created_at DESC);
CREATE INDEX connect_posts_city_idx ON public.connect_posts (city);
CREATE INDEX connect_posts_author_idx ON public.connect_posts (author_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_posts TO authenticated;
GRANT ALL ON public.connect_posts TO service_role;

ALTER TABLE public.connect_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active posts"
  ON public.connect_posts FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can insert their own posts"
  ON public.connect_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_profile_id = public.my_profile_id());

CREATE POLICY "Users can update their own posts"
  ON public.connect_posts FOR UPDATE
  TO authenticated
  USING (author_profile_id = public.my_profile_id())
  WITH CHECK (author_profile_id = public.my_profile_id());

CREATE POLICY "Users or admins can delete posts"
  ON public.connect_posts FOR DELETE
  TO authenticated
  USING (author_profile_id = public.my_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER connect_posts_set_updated_at
  BEFORE UPDATE ON public.connect_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comments table
CREATE TABLE public.connect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.connect_posts(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX connect_comments_post_idx ON public.connect_comments (post_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_comments TO authenticated;
GRANT ALL ON public.connect_comments TO service_role;

ALTER TABLE public.connect_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments on active posts"
  ON public.connect_comments FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.connect_posts p WHERE p.id = post_id AND p.expires_at > now()));

CREATE POLICY "Users can insert their own comments"
  ON public.connect_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_profile_id = public.my_profile_id());

CREATE POLICY "Users or admins can delete comments"
  ON public.connect_comments FOR DELETE
  TO authenticated
  USING (author_profile_id = public.my_profile_id() OR public.has_role(auth.uid(), 'admin'));
