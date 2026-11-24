CREATE OR REPLACE FUNCTION public.sync_open_game_communities()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_host uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('psm.open-game-communities'));
 SELECT host_profile_id INTO v_host FROM public.open_game_slots WHERE series = 'la-moraleja' AND active LIMIT 1;
 IF v_host IS NULL THEN RETURN; END IF;
 INSERT INTO public.open_game_slots (series, host_profile_id, city, country, club_name, time_zone, local_start, level_min, level_max, note, active, time_tbd)
 SELECT 'community-' || md5(c->>'key'), v_host, c->>'city', c->>'country',
   (c->>'label') || CASE WHEN c->>'country' = 'Spain' THEN ' · Club por decidir' ELSE ' · Club to be decided' END,
   c->>'time_zone', '23:59'::time, 'just starting', 'advanced', NULL, true, true
 FROM (
   SELECT DISTINCT ON (c->>'key') c FROM (
     SELECT public.open_game_community(l) AS c
     FROM public.profiles p CROSS JOIN LATERAL unnest(p.locations) l
     WHERE NOT p.is_seed AND p.suspended_at IS NULL
     UNION ALL
     SELECT public.open_game_community(l) FROM (VALUES
       ('Spain | Madrid | La Moraleja'), ('Spain | Madrid | Salamanca & Chamberí'),
       ('United Kingdom | London | Chelsea & Battersea'), ('United Kingdom | London | Padelodontics'),
       ('United States | Miami | Coconut Grove & Brickell'), ('Spain | Marbella | '), ('United Arab Emirates | Dubai | ')
     ) v(l)
   ) raw WHERE c IS NOT NULL ORDER BY c->>'key'
 ) communities
 WHERE NOT EXISTS (
   SELECT 1 FROM public.open_game_slots s
   WHERE s.active AND public.open_game_community(s.country || ' | ' || CASE WHEN s.city = 'La Moraleja' THEN 'Madrid' ELSE s.city END || ' | ' || CASE WHEN lower(trim(split_part(s.club_name, '·', 1))) = lower(s.city) AND s.city <> 'La Moraleja' THEN '' ELSE trim(split_part(s.club_name, '·', 1)) END)->>'key' = c->>'key'
 ) ON CONFLICT (series, local_start, level_min, level_max) DO NOTHING;
END;
$fn$;
REVOKE ALL ON FUNCTION public.sync_open_game_communities() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_open_game_communities() TO service_role;