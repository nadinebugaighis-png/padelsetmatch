import { createServerFn } from "@tanstack/react-start";

/** Club pages list a club's upcoming open games without sign-in, so return only
 *  what a shared match page already shows: time, level band and seats taken. */
export type ClubGame = { id: string; starts_at: string; time_tbd: boolean; level_min: string; level_max: string; players: number; capacity: number };

const CLUBS: Record<string, string[]> = {
  "la-moraleja": ["Club de Pádel La Moraleja", "La Moraleja Club de Pádel"],
};

export const listClubGames = createServerFn({ method: "GET" })
  .inputValidator((d: { club: string }) => ({ club: String(d?.club ?? "") }))
  .handler(async ({ data }): Promise<ClubGame[]> => {
    const names = CLUBS[data.club];
    if (!names) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("match_events")
      .select("id, starts_at, time_tbd, level_min, level_max, is_class, class_students, joins_on_playtomic, match_event_participants(count)")
      .in("club_name", names)
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(8);
    return (rows ?? []).filter((r) => !r.joins_on_playtomic).map((r) => {
      const cnt = (r.match_event_participants as unknown as { count: number }[])?.[0]?.count ?? 0;
      return { id: r.id, starts_at: r.starts_at, time_tbd: r.time_tbd, level_min: r.level_min, level_max: r.level_max, players: cnt, capacity: r.is_class ? 1 + (r.class_students ?? 4) : 4 };
    });
  });
