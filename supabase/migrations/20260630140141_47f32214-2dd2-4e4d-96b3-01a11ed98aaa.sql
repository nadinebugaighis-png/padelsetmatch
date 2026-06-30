ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_court_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_court_note text;