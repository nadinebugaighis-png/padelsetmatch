ALTER TABLE public.compatibility_scores ADD COLUMN IF NOT EXISTS sub_scores jsonb;
ALTER TABLE public.compatibility_feedback ADD COLUMN IF NOT EXISTS feedback_reason text;