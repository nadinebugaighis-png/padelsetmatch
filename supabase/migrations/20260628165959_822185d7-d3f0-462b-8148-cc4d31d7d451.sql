ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}';