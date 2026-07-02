ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_traits text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS padel_style text[] NOT NULL DEFAULT '{}';