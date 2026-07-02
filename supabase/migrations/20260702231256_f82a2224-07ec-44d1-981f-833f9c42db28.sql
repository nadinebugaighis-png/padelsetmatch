ALTER TABLE public.hides ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'all';
ALTER TABLE public.hides DROP CONSTRAINT IF EXISTS hides_hider_profile_id_hidden_profile_id_key;
ALTER TABLE public.hides ADD CONSTRAINT hides_hider_hidden_category_key UNIQUE (hider_profile_id, hidden_profile_id, category);
ALTER TABLE public.hides DROP CONSTRAINT IF EXISTS hides_category_check;
ALTER TABLE public.hides ADD CONSTRAINT hides_category_check CHECK (category IN ('partner','friend','all'));