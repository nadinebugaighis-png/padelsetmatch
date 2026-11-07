ALTER TYPE public.match_gender_rule ADD VALUE IF NOT EXISTS 'open';
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS free_court boolean NOT NULL DEFAULT false;