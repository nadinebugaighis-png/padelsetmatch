CREATE OR REPLACE FUNCTION public.open_game_community(_location text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
 c text := trim(split_part(_location, '|', 1));
 ci text := trim(split_part(_location, '|', 2));
 a text := regexp_replace(trim(split_part(_location, '|', 3)), '[.[:space:]]+$', '');
 f text;
 tz text;
BEGIN
 IF c = '' OR ci = '' THEN RETURN NULL; END IF;
 f := lower(translate(a, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'));
 IF lower(ci) IN ('dubai', 'marbella') THEN a := ''; f := '';
 ELSIF f IN ('el soto','soto') OR f LIKE ANY (ARRAY['%moraleja%','%encinar%','%arroyo de la vega%','%solana%','%diversia%','%brains%']) THEN a := 'La Moraleja'; f := 'la moraleja';
 ELSIF f IN ('salamanca','chamberi','salamanca & chamberi') THEN a := 'Salamanca & Chamberí'; f := 'salamanca & chamberi';
 ELSIF f IN ('chelsea','battersea','chelsea & battersea') THEN a := 'Chelsea & Battersea'; f := 'chelsea & battersea';
 ELSIF f IN ('coconut grove','brickell','coconut grove & brickell') THEN a := 'Coconut Grove & Brickell'; f := 'coconut grove & brickell';
 END IF;
 tz := CASE lower(c)
 WHEN 'spain' THEN CASE WHEN lower(ci) IN ('gran canaria','las palmas','tenerife') THEN 'Atlantic/Canary' ELSE 'Europe/Madrid' END
 WHEN 'united kingdom' THEN 'Europe/London'
 WHEN 'united arab emirates' THEN 'Asia/Dubai'
 WHEN 'portugal' THEN 'Europe/Lisbon'
 WHEN 'saudi arabia' THEN 'Asia/Riyadh'
 WHEN 'libya' THEN 'Africa/Tripoli'
 WHEN 'egypt' THEN 'Africa/Cairo'
 WHEN 'slovenia' THEN 'Europe/Ljubljana'
 WHEN 'france' THEN 'Europe/Paris'
 WHEN 'italy' THEN 'Europe/Rome'
 WHEN 'germany' THEN 'Europe/Berlin'
 WHEN 'united states' THEN CASE WHEN lower(ci) IN ('seattle','los angeles','san francisco','san diego') THEN 'America/Los_Angeles' WHEN lower(ci) IN ('dallas / fort worth','dallas','chicago','houston','austin') THEN 'America/Chicago' WHEN lower(ci) IN ('denver') THEN 'America/Denver' ELSE 'America/New_York' END
 ELSE 'UTC' END;
 RETURN jsonb_build_object('key', lower(translate(c || '|' || ci, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) || '|' || f, 'country', c, 'city', ci, 'label', coalesce(nullif(a,''),ci), 'time_zone', tz);
END;
$fn$;
REVOKE ALL ON FUNCTION public.open_game_community(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_game_community(text) TO service_role;

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
   WHERE s.active AND public.open_game_community(s.country || ' | ' || CASE WHEN s.city = 'La Moraleja' THEN 'Madrid' ELSE s.city END || ' | ' || trim(split_part(s.club_name, '·', 1)))->>'key' = c->>'key'
 ) ON CONFLICT (series, local_start, level_min, level_max) DO NOTHING;
END;
$fn$;
REVOKE ALL ON FUNCTION public.sync_open_game_communities() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_open_game_communities() TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_open_games(_days_ahead integer DEFAULT 7)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE s record; d int; v_start timestamptz; v_count int := 0;
BEGIN
 PERFORM public.sync_open_game_communities();
 PERFORM set_config('app.house_games', 'on', true);
 FOR s IN SELECT * FROM public.open_game_slots WHERE active LOOP
   FOR d IN 0.._days_ahead LOOP
     v_start := (((now() AT TIME ZONE s.time_zone)::date + d) + s.local_start) AT TIME ZONE s.time_zone;
     CONTINUE WHEN v_start <= now();
     INSERT INTO public.open_game_runs (slot_id, starts_at) VALUES (s.id, v_start) ON CONFLICT DO NOTHING;
     CONTINUE WHEN NOT FOUND;
     CONTINUE WHEN NOT s.time_tbd AND EXISTS (
       SELECT 1 FROM public.match_events e WHERE lower(coalesce(e.city,'')) = lower(s.city)
       AND e.starts_at = v_start AND e.level_min = s.level_min AND e.level_max = s.level_max
     );
     INSERT INTO public.match_events (host_profile_id, starts_at, club_name, city, country, level_min, level_max, gender_rule, note, status, auto_slot_id, time_tbd)
     VALUES (s.host_profile_id, v_start, s.club_name, s.city, s.country, s.level_min, s.level_max, 'open', s.note, 'open', s.id, s.time_tbd);
     v_count := v_count + 1;
   END LOOP;
 END LOOP;
 PERFORM set_config('app.house_games', 'off', true);
 RETURN v_count;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ensure_open_games(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_open_games(integer) TO service_role;