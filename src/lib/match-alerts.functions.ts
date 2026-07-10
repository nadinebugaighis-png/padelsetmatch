import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MatchAlert = {
  id: string;
  profile_id: string;
  label: string | null;
  city: string | null;
  days_of_week: number[];
  hour_start: number;
  hour_end: number;
  level_only: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const listMyMatchAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) return { items: [] as MatchAlert[] };
    const { data, error } = await context.supabase
      .from("match_alerts")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as MatchAlert[] };
  });

const upsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  label: z.string().max(80).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  hour_start: z.number().int().min(0).max(23),
  hour_end: z.number().int().min(1).max(24),
  level_only: z.boolean(),
  active: z.boolean(),
});

export const upsertMatchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.hour_end <= data.hour_start) throw new Error("End time must be after start time");
    const { data: profile } = await context.supabase
      .from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const row = {
      profile_id: profile.id,
      label: data.label ?? null,
      city: data.city && data.city.trim() ? data.city.trim() : null,
      days_of_week: data.days_of_week,
      hour_start: data.hour_start,
      hour_end: data.hour_end,
      level_only: data.level_only,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("match_alerts").update(row).eq("id", data.id).eq("profile_id", profile.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await context.supabase.from("match_alerts").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

export const deleteMatchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await context.supabase.from("match_alerts").delete().eq("id", data.id).eq("profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleMatchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await context.supabase
      .from("match_alerts").update({ active: data.active }).eq("id", data.id).eq("profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
