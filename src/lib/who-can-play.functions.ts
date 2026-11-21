import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PLAY_SLOTS, connectAreaOptions, type ConnectArea, type PlayCheckin, type PlaySlot } from "./who-can-play";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const areaKey = z.string().min(1).max(120);

async function me(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("id, locations").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No profile");
  const options = connectAreaOptions((data as { locations: unknown }).locations);
  return { id: (data as { id: string }).id, ...options };
}

/** Only the player's own areas or the main communities can be browsed or posted to. */
function pickArea(viewer: { mine: ConnectArea[]; elsewhere: ConnectArea[] }, key: string | undefined): ConnectArea | null {
  if (!key) return viewer.mine[0] ?? null;
  return [...viewer.mine, ...viewer.elsewhere].find((a) => a.key === key) ?? null;
}

type Person = { id: string; first_name: string | null; photo_url: string | null; level: string | null };

async function people(supabase: any, ids: string[]): Promise<Map<string, Person>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, first_name, photo_url, level").in("id", ids);
  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]));
}

export type MyCheckin = { date: string; slot: PlaySlot; areaKeys: string[]; areaLabel: string | null };

/** Availability for one area (home area unless the player switched), plus the player's own check-ins anywhere. */
export const listPlayCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from: isoDate, to: isoDate, area: areaKey.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    const area = pickArea(viewer, data.area);
    const base = { mine: viewer.mine, elsewhere: viewer.elsewhere, area };
    if (!area) return { ...base, checkins: [] as PlayCheckin[], myCheckins: [] as MyCheckin[], messageCounts: {} as Record<string, number> };

    const [rowsRes, myRes, msgRes] = await Promise.all([
      context.supabase
        .from("play_checkins")
        .select("id, profile_id, play_date, slot")
        .gte("play_date", data.from)
        .lte("play_date", data.to)
        .contains("area_keys", [area.key])
        .order("created_at", { ascending: true })
        .limit(400),
      context.supabase
        .from("play_checkins")
        .select("play_date, slot, area_keys, area_label")
        .eq("profile_id", viewer.id)
        .gte("play_date", data.from)
        .lte("play_date", data.to),
      context.supabase
        .from("play_slot_messages")
        .select("play_date, slot")
        .eq("area_key", area.key)
        .gte("play_date", data.from)
        .lte("play_date", data.to)
        .limit(2000),
    ]);
    if (rowsRes.error) throw rowsRes.error;
    if (myRes.error) throw myRes.error;
    const list = (rowsRes.data ?? []) as Array<{ id: string; profile_id: string; play_date: string; slot: PlaySlot }>;
    const byId = await people(context.supabase, Array.from(new Set(list.map((r) => r.profile_id))));
    const checkins: PlayCheckin[] = [];
    for (const r of list) {
      const p = byId.get(r.profile_id);
      if (!p) continue; // suspended or otherwise hidden players stay out
      checkins.push({ ...r, first_name: p.first_name, photo_url: p.photo_url, level: p.level, mine: r.profile_id === viewer.id });
    }
    const myCheckins: MyCheckin[] = ((myRes.data ?? []) as Array<{ play_date: string; slot: PlaySlot; area_keys: string[]; area_label: string | null }>)
      .map((r) => ({ date: r.play_date, slot: r.slot, areaKeys: r.area_keys ?? [], areaLabel: r.area_label }));
    const messageCounts: Record<string, number> = {};
    for (const m of (msgRes.data ?? []) as Array<{ play_date: string; slot: string }>) {
      const k = `${m.play_date}|${m.slot}`;
      messageCounts[k] = (messageCounts[k] ?? 0) + 1;
    }
    return { ...base, checkins, myCheckins, messageCounts };
  });

export const addPlayCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: isoDate, slot: z.enum(PLAY_SLOTS), area: areaKey }).parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    const area = pickArea(viewer, data.area);
    if (!area) throw new Error("Choose an area first");
    const { error } = await context.supabase.from("play_checkins").insert({
      profile_id: viewer.id,
      play_date: data.date,
      slot: data.slot,
      area_keys: [area.key],
      area_label: area.label.slice(0, 80),
    });
    if (error?.code === "23505") throw new Error("You're already available at this time in another area");
    if (error) throw error;
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

export type SlotMessage = {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
  sender: { id: string; first_name: string | null; photo_url: string | null; level: string | null };
};

const thread = z.object({ area: areaKey, date: isoDate, slot: z.enum(PLAY_SLOTS) });

/** The chat for one area, day and part of the day. */
export const listSlotMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => thread.parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("play_slot_messages")
      .select("id, body, created_at, sender_profile_id")
      .eq("area_key", data.area)
      .eq("play_date", data.date)
      .eq("slot", data.slot)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw error;
    const list = (rows ?? []) as Array<{ id: string; body: string; created_at: string; sender_profile_id: string }>;
    const byId = await people(context.supabase, Array.from(new Set(list.map((r) => r.sender_profile_id))));
    const messages: SlotMessage[] = [];
    for (const r of list) {
      const p = byId.get(r.sender_profile_id);
      if (!p) continue;
      messages.push({ id: r.id, body: r.body, created_at: r.created_at, mine: r.sender_profile_id === viewer.id, sender: p });
    }
    return { messages };
  });

export const sendSlotMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => thread.extend({ body: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const viewer = await me(context.supabase, context.userId);
    const { error } = await context.supabase.from("play_slot_messages").insert({
      area_key: data.area,
      play_date: data.date,
      slot: data.slot,
      sender_profile_id: viewer.id,
      body: data.body,
    });
    if (error?.code === "42501") throw new Error("Say you're free at this time to join the chat");
    if (error) throw error;
    return { ok: true };
  });

export const deleteSlotMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("play_slot_messages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
