import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { feedAreas } from "./feed-areas";
import { PLAY_SLOTS, type PlayCheckin, type PlaySlot } from "./who-can-play";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function me(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("id, locations").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No profile");
  const areas = feedAreas((data as { locations: unknown }).locations);
  return { id: (data as { id: string }).id, areas };
}

/** Check-ins from players who share one of the viewer's areas, plus the viewer's own. */
export const listPlayCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from: isoDate, to: isoDate }).parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    const keys = viewer.areas.map((a) => a.key);
    const areaLabels = viewer.areas.map((a) => a.label);
    if (keys.length === 0) return { areaLabels, checkins: [] as PlayCheckin[] };

    const { data: rows, error } = await context.supabase
      .from("play_checkins")
      .select("id, profile_id, play_date, slot")
      .gte("play_date", data.from)
      .lte("play_date", data.to)
      .or(`area_keys.ov.{${keys.map((k) => `"${k.replace(/"/g, "")}"`).join(",")}},profile_id.eq.${viewer.id}`)
      .order("created_at", { ascending: true })
      .limit(400);
    if (error) throw error;
    const list = (rows ?? []) as Array<{ id: string; profile_id: string; play_date: string; slot: PlaySlot }>;
    const ids = Array.from(new Set(list.map((r) => r.profile_id)));
    const { data: people } = ids.length
      ? await context.supabase.from("profiles").select("id, first_name, photo_url, level").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map(((people ?? []) as Array<{ id: string; first_name: string | null; photo_url: string | null; level: string | null }>).map((p) => [p.id, p]));
    const checkins: PlayCheckin[] = [];
    for (const r of list) {
      const p = byId.get(r.profile_id);
      if (!p) continue; // suspended or otherwise hidden players stay out
      checkins.push({ ...r, first_name: p.first_name, photo_url: p.photo_url, level: p.level, mine: r.profile_id === viewer.id });
    }
    return { areaLabels, checkins };
  });

export const addPlayCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: isoDate, slot: z.enum(PLAY_SLOTS) }).parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    if (viewer.areas.length === 0) throw new Error("Add your area in Me first");
    const { error } = await context.supabase.from("play_checkins").insert({
      profile_id: viewer.id,
      play_date: data.date,
      slot: data.slot,
      area_keys: viewer.areas.map((a) => a.key),
      area_label: viewer.areas[0]!.label.slice(0, 80),
    });
    if (error && error.code !== "23505") throw error;
    return { ok: true };
  });

export const removePlayCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: isoDate, slot: z.enum(PLAY_SLOTS) }).parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("play_checkins")
      .delete()
      .eq("profile_id", viewer.id)
      .eq("play_date", data.date)
      .eq("slot", data.slot);
    if (error) throw error;
    return { ok: true };
  });
