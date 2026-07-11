ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS play_frequency text,
  ADD COLUMN IF NOT EXISTS favorite_clubs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_sports text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS main_goal text,
  ADD COLUMN IF NOT EXISTS looking_for_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS level_detail text;