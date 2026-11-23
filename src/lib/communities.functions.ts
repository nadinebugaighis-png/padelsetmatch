import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildDirectory, communityOf, newCommunityLocation } from "./communities";

const MAX_LOCATIONS = 15;
const locationInput = z.object({ location: z.string().min(3).max(200) });

/** Directory of every community with live member counts (active real players only). */
export const getCommunityDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { data: me }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("locations")
        .is("suspended_at", null)
        .eq("is_seed", false)
        .not("user_id", "is", null),
      context.supabase.from("profiles").select("locations").eq("user_id", context.userId).maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    return buildDirectory((rows ?? []) as Array<{ locations: string[] | null }>, me?.locations ?? []);
  });

async function myLocations(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from("profiles").select("id, locations").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Create your profile first");
  return data as { id: string; locations: string[] | null };
}

/** Join an existing community, or start a new one (country, city, optional neighbourhood). */
export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.union([
      locationInput,
      z.object({ country: z.string().max(60), city: z.string().max(60), area: z.string().max(60) }),
    ]).parse(d),
  )
  .handler(async ({ data, context }) => {
    const raw = "location" in data ? data.location : newCommunityLocation(data.country, data.city, data.area);
    const target = raw ? communityOf(raw) : null;
    if (!raw || !target) throw new Error("Choose a country and a city");
    const me = await myLocations(context);
    const current = me.locations ?? [];
    if (current.some((l) => communityOf(l)?.key === target.key)) return { location: raw, alreadyMember: true };
    if (current.length >= MAX_LOCATIONS) throw new Error("You already belong to the most communities allowed");
    const { error } = await context.supabase.from("profiles").update({ locations: [...current, raw] }).eq("id", me.id);
    if (error) throw new Error(error.message);
    return { location: raw, alreadyMember: false };
  });

/** Leave a community. Players always keep at least one. */
export const leaveCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => locationInput.parse(d))
  .handler(async ({ data, context }) => {
    const target = communityOf(data.location);
    if (!target) throw new Error("Unknown community");
    const me = await myLocations(context);
    const current = me.locations ?? [];
    const next = current.filter((l) => communityOf(l)?.key !== target.key);
    if (next.length === current.length) return { ok: true };
    if (next.length === 0) throw new Error("Keep at least one community");
    const { error } = await context.supabase.from("profiles").update({ locations: next }).eq("id", me.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
