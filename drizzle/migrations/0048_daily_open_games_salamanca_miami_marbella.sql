INSERT INTO public.open_game_slots (series, host_profile_id, city, country, club_name, time_zone, local_start, level_min, level_max, note, active, time_tbd)
SELECT v.series, s.host_profile_id, v.city, v.country, v.club_name, v.tz, '21:00'::time, 'just starting', 'advanced', NULL, true, true
FROM (VALUES
  ('salamanca-chamberi', 'Madrid', 'Spain', 'Salamanca & Chamberí · Club por decidir', 'Europe/Madrid'),
  ('miami', 'Miami', 'United States', 'Coconut Grove & Brickell · Club to be decided', 'America/New_York'),
  ('marbella', 'Marbella', 'Spain', 'Marbella · Club por decidir', 'Europe/Madrid')
) AS v(series, city, country, club_name, tz)
CROSS JOIN LATERAL (
  SELECT host_profile_id FROM public.open_game_slots WHERE series = 'la-moraleja' AND active LIMIT 1
) s
ON CONFLICT (series, local_start, level_min, level_max) DO NOTHING;

SELECT public.ensure_open_games(7);