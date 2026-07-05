
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_moderation_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS photo_moderation_reason TEXT;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS category TEXT;
