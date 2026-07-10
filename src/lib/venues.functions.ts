import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function myProfileId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles" as never)
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile not found");
  return (data as { id: string }).id;
}

function normalize(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export type Venue = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  venue_type: "club" | "compound" | "public_court" | "other";
};

export type MyVenue = { venue: Venue; is_public: boolean };

export const searchVenues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const q = normalize(data.query);
    const { data: rows, error } = await context.supabase
      .from("venues" as never)
      .select("id, name, city, country, venue_type")
      .ilike("normalized_name", `%${q}%`)
      .order("name", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Venue[];
  });

export const createVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        city: z.string().trim().max(60).optional().nullable(),
        country: z.string().trim().max(60).optional().nullable(),
        venue_type: z.enum(["club", "compound", "public_court", "other"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const normalized_name = normalize(data.name);
    const city = data.city?.trim() || null;
    const country = data.country?.trim() || null;

    // Look up existing match on (normalized_name, city, country).
    let lookup = context.supabase
      .from("venues" as never)
      .select("id, name, city, country, venue_type")
      .eq("normalized_name", normalized_name);
    lookup = city === null ? lookup.is("city", null) : lookup.eq("city", city);
    lookup = country === null ? lookup.is("country", null) : lookup.eq("country", country);
    const { data: existing } = await lookup.maybeSingle();

    if (existing) return existing as Venue;

    const { data: inserted, error } = await context.supabase
      .from("venues" as never)
      .insert({
        name: data.name.trim(),
        normalized_name,
        city,
        country,
        venue_type: data.venue_type,
        created_by: meId,
      } as never)
      .select("id, name, city, country, venue_type")
      .single();

    if (error) {
      // Race on the unique index — refetch and return the existing row.
      let refetch = context.supabase
        .from("venues" as never)
        .select("id, name, city, country, venue_type")
        .eq("normalized_name", normalized_name);
      refetch = city === null ? refetch.is("city", null) : refetch.eq("city", city);
      refetch = country === null ? refetch.is("country", null) : refetch.eq("country", country);
      const { data: again } = await refetch.maybeSingle();
      if (!again) throw new Error(error.message);
      return again as Venue;
    }

    return inserted as Venue;
  });

export const listMyVenues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profile_venues" as never)
      .select("is_public, venue:venues!inner(id, name, city, country, venue_type)")
      .eq("profile_id", meId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as MyVenue[]);
  });

export const addMyVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ venue_id: z.string().uuid(), is_public: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("profile_venues" as never)
      .upsert({ profile_id: meId, venue_id: data.venue_id, is_public: data.is_public } as never, {
        onConflict: "profile_id,venue_id",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMyVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ venue_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("profile_venues" as never)
      .delete()
      .eq("profile_id", meId)
      .eq("venue_id", data.venue_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMyVenuePrivacy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ venue_id: z.string().uuid(), is_public: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("profile_venues" as never)
      .update({ is_public: data.is_public } as never)
      .eq("profile_id", meId)
      .eq("venue_id", data.venue_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSharedVenues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ other_profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("shared_venues" as never, {
      _a: meId,
      _b: data.other_profile_id,
    } as never);
    if (error) throw new Error(error.message);
    return (result ?? { count: 0, names: [] }) as { count: number; names: string[] };
  });

export type SharedVenueSummary = { count: number; names: string[] };

export const getSharedVenuesBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ profile_ids: z.array(z.string().uuid()).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const ids = Array.from(new Set(data.profile_ids)).filter((id) => id !== meId);
    if (ids.length === 0) return {} as Record<string, SharedVenueSummary>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results = await Promise.all(
      ids.map(async (id) => {
        const { data: r } = await supabaseAdmin.rpc("shared_venues" as never, {
          _a: meId,
          _b: id,
        } as never);
        return [id, (r ?? { count: 0, names: [] }) as SharedVenueSummary] as const;
      }),
    );
    const out: Record<string, SharedVenueSummary> = {};
    for (const [id, summary] of results) {
      if (summary.count > 0) out[id] = summary;
    }
    return out;
  });
