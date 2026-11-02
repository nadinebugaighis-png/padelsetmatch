ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_bracket_lo int,
  ADD COLUMN IF NOT EXISTS age_bracket_hi int;

COMMENT ON COLUMN public.profiles.age_bracket_lo IS 'Lower bound of the age bracket chosen at signup (18/25/35/46/56); null for legacy rows that stored a typed exact age';
COMMENT ON COLUMN public.profiles.age_bracket_hi IS 'Upper bound of the age bracket chosen at signup (24/34/45/55/99); null for legacy rows that stored a typed exact age';

-- Backfill rows whose stored age is exactly a bracket midpoint (the value the
-- bracket picker has always saved). Rows with other values keep null bounds and
-- fall back to exact-age matching.
UPDATE public.profiles SET age_bracket_lo = 18, age_bracket_hi = 24 WHERE age = 21;
UPDATE public.profiles SET age_bracket_lo = 25, age_bracket_hi = 34 WHERE age = 30;
UPDATE public.profiles SET age_bracket_lo = 35, age_bracket_hi = 45 WHERE age = 40;
UPDATE public.profiles SET age_bracket_lo = 46, age_bracket_hi = 55 WHERE age = 51;
UPDATE public.profiles SET age_bracket_lo = 56, age_bracket_hi = 99 WHERE age = 78;
