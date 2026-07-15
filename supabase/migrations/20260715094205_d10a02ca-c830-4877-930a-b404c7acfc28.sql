ALTER TABLE public.profiles ALTER COLUMN world_mode SET DEFAULT true;
UPDATE public.profiles SET world_mode = true WHERE world_mode IS DISTINCT FROM true;