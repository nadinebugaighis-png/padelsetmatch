ALTER TABLE public.connect_posts
  ALTER COLUMN author_profile_id DROP NOT NULL;

ALTER TABLE public.connect_comments
  ALTER COLUMN author_profile_id DROP NOT NULL;