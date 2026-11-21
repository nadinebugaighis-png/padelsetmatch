import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { placeFields, type CoachSlot } from "@/lib/coach-lessons";

export type LessonPerson = { id: string; first_name: string | null; photo_url: string | null; zone: string | null };

const SLOT_COLS = "id, coach_profile_id, starts_at, duration_minutes, club_name, price_note, status, student_profile_id, student_note, lesson_place, travel_area, student_place";

type Sb = { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any };

async function me(sb: Sb, userId: string): Promise<{ id: string; is_coach: boolean } | null> {
  const { data } = await sb.from("profiles").select("id, is_coach").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

async function people(sb: Sb, ids: (string | null)[]): Promise<Record<string, LessonPerson>> {
  const uniq = [...new Set(ids.filter(Boolean))] as string[];
  if (!uniq.length) return {};
  const { data } = await sb.from("profiles").select("id, first_name, photo_url, zone").in("id", uniq);
  const out: Record<string, LessonPerson> = {};
  for (const p of (data as LessonPerson[] | null) ?? []) out[p.id] = p;
  return out;
}

/** Open lesson times for the next three weeks, plus the lessons I asked for. */
export const getCoachBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const profile = await me(sb, context.userId);
    const nowIso = new Date().toISOString();
    const until = new Date(Date.now() + 21 * 86400_000).toISOString();
    const [open, mine] = await Promise.all([
      sb.from("coach_slots").select(SLOT_COLS).eq("status", "open").gt("starts_at", nowIso).lt("starts_at", until).order("starts_at").limit(600),
      profile
        ? sb.from("coach_slots").select(SLOT_COLS).eq("student_profile_id", profile.id).gt("starts_at", new Date(Date.now() - 3600_000).toISOString()).order("starts_at")
        : Promise.resolve({ data: [] }),
    ]);
    if (open.error) throw new Error(open.error.message);
    const slots = (open.data ?? []) as CoachSlot[];
    const lessons = (mine.data ?? []) as CoachSlot[];
    const byId = await people(sb, [...slots.map((s) => s.coach_profile_id), ...lessons.map((s) => s.coach_profile_id)]);
    return { meId: profile?.id ?? null, isCoach: !!profile?.is_coach, slots, lessons, people: byId };
  });

/** A coach's own upcoming lesson times, requests first. */
export const getMyCoachSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const profile = await me(sb, context.userId);
    if (!profile) return { isCoach: false, slots: [] as CoachSlot[], people: {} as Record<string, LessonPerson> };
    const { data, error } = await sb.from("coach_slots").select(SLOT_COLS).eq("coach_profile_id", profile.id)
      .gt("starts_at", new Date(Date.now() - 3600_000).toISOString()).order("starts_at").limit(400);
    if (error) throw new Error(error.message);
    const slots = (data ?? []) as CoachSlot[];
    return { isCoach: profile.is_coach, slots, people: await people(sb, slots.map((s) => s.student_profile_id)) };
  });

export const addCoachSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    starts: z.array(z.string().datetime()).min(1).max(24),
    duration_minutes: z.union([z.literal(60), z.literal(90)]),
    lesson_place: z.enum(["club", "travel", "both"]),
    club_name: z.string().trim().max(120),
    travel_area: z.string().trim().max(120),
    price_note: z.string().trim().max(40).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const profile = await me(sb, context.userId);
    if (!profile?.is_coach) throw new Error("Turn on coach mode first");
    const place = placeFields(data.lesson_place, data.club_name, data.travel_area);
    if (!place) throw new Error(data.lesson_place === "club" ? "Add the club" : "Add the club and the areas you cover");
    const rows = data.starts.filter((s) => new Date(s).getTime() > Date.now()).map((starts_at) => ({
      coach_profile_id: profile.id, starts_at, duration_minutes: data.duration_minutes,
      lesson_place: data.lesson_place, ...place, price_note: data.price_note || null,
    }));
    if (!rows.length) throw new Error("Pick a time that hasn't passed");
    const { error } = await sb.from("coach_slots").upsert(rows, { onConflict: "coach_profile_id,starts_at", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { added: rows.length };
  });

const SlotId = z.object({ slotId: z.string().uuid() });

export const requestCoachSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SlotId.extend({
    note: z.string().trim().max(200).nullable(),
    place: z.enum(["club", "travel"]).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Sb).rpc("request_coach_slot", { _slot: data.slotId, _note: data.note, _place: data.place });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondCoachSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SlotId.extend({ accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Sb).rpc("respond_coach_slot", { _slot: data.slotId, _accept: data.accept });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelCoachSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SlotId.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Sb).rpc("cancel_coach_slot", { _slot: data.slotId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
