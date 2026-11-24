import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { communityOf } from "../src/lib/communities";

// Integration checks against the shared backend, read-only and without credentials in source.
function query(sql: string): Record<string, unknown> {
  const result: { rows?: Record<string, unknown>[] } = JSON.parse(
    execFileSync("lovable", ["supabase", "query", sql, "--json"], { encoding: "utf8" }),
  );
  const row = result.rows?.[0];
  if (!row) throw new Error("The community check returned no rows");
  return row;
}

describe("daily community open games", () => {
  it("Padelodontics has one all-levels, unclaimed, choose-the-time game for each of the next eight dates", () => {
    const row = query(`SELECT count(*)::int AS games,
      count(DISTINCT (e.starts_at AT TIME ZONE s.time_zone)::date)::int AS dates,
      bool_and(e.time_tbd AND e.level_min = 'just starting' AND e.level_max = 'advanced'
        AND e.gender_rule = 'open' AND e.note IS NULL) AS neutral
      FROM public.open_game_slots s JOIN public.match_events e ON e.auto_slot_id = s.id
      WHERE s.active AND s.club_name = 'Padelodontics · Club to be decided'
        AND (e.starts_at AT TIME ZONE s.time_zone)::date BETWEEN
          (now() AT TIME ZONE s.time_zone)::date AND (now() AT TIME ZONE s.time_zone)::date + 7`);
    expect(row['games']).toBe(8);
    expect(row['dates']).toBe(8);
    expect(row['neutral']).toBe(true);
  }, 30_000);

  it("every current player community has an active daily-game schedule", () => {
    const row = query(`SELECT
      (SELECT jsonb_agg(DISTINCT regexp_replace(l, '[.[:space:]]+$', '')) FROM public.profiles p CROSS JOIN LATERAL unnest(p.locations) l
       WHERE NOT p.is_seed AND p.suspended_at IS NULL) AS locations,
      (SELECT jsonb_agg(country || ' | ' || CASE WHEN city = 'La Moraleja' THEN 'Madrid' ELSE city END
       || ' | ' || CASE WHEN lower(trim(split_part(club_name, '·', 1))) = lower(city) AND city <> 'La Moraleja'
         THEN '' ELSE trim(split_part(club_name, '·', 1)) END) FROM public.open_game_slots WHERE active) AS schedules`);
    const locations = row['locations'] as string[];
    const schedules = row['schedules'] as string[];
    const keys = new Set(schedules.map((l) => communityOf(l)?.key));
    const missing = locations.filter((l) => {
      const key = communityOf(l)?.key;
      return key && !keys.has(key);
    });
    expect(missing).toEqual([]);
  }, 30_000);

  it("aliases reuse the same community while Padelodontics stays separate from Chelsea", () => {
    expect(communityOf('Spain | Madrid | El Soto')?.key).toBe(communityOf('Spain | Madrid | La Moraleja')?.key);
    expect(communityOf('Spain | Madrid | Chamberí')?.key).toBe(communityOf('Spain | Madrid | Salamanca')?.key);
    expect(communityOf('United Arab Emirates | Dubai | Arabian Ranches')?.key).toBe(communityOf('United Arab Emirates | Dubai | ')?.key);
    expect(communityOf('United Kingdom | London | Padelodontics')?.key).not.toBe(communityOf('United Kingdom | London | Chelsea & Battersea')?.key);
  }, 30_000);

  it("no community has duplicate active daily schedules", () => {
    const row = query(`SELECT jsonb_agg(country || ' | ' || CASE WHEN city = 'La Moraleja'
      THEN 'Madrid' ELSE city END || ' | ' || CASE WHEN lower(trim(split_part(club_name, '·', 1))) = lower(city) AND city <> 'La Moraleja'
        THEN '' ELSE trim(split_part(club_name, '·', 1)) END) AS schedules
      FROM public.open_game_slots WHERE active`);
    const schedules = row['schedules'] as string[];
    const keys = schedules.map((l) => communityOf(l)?.key);
    expect(new Set(keys).size).toBe(keys.length);
  }, 30_000);
});