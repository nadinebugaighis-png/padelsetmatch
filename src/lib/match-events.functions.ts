import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PADEL_LEVELS } from "./types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// ---------- Club search (Google Places API - New, via gateway) ----------
export const searchClubs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; near?: { lat: number; lng: number } | null }) =>
    z.object({
      query: z.string().min(2).max(120),
      near: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return { results: [] as ClubResult[] };

    const body: Record<string, unknown> = {
      textQuery: `${data.query} padel club`,
      maxResultCount: 8,
    };
    if (data.near) {
      body.locationBias = {
        circle: { center: { latitude: data.near.lat, longitude: data.near.lng }, radius: 50000 },
      };
    }
    try {
      const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { results: [] as ClubResult[] };
      const json = await res.json() as {
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
          addressComponents?: Array<{ types: string[]; longText: string; shortText?: string }>;
        }>;
      };
      const results: ClubResult[] = (json.places ?? []).map((p) => {
        const city = p.addressComponents?.find((c) => c.types?.includes("locality"))?.longText
          ?? p.addressComponents?.find((c) => c.types?.includes("administrative_area_level_2"))?.longText
          ?? "";
        const country = p.addressComponents?.find((c) => c.types?.includes("country"))?.longText ?? "";
        return {
          place_id: p.id,
          name: p.displayName?.text ?? "",
          address: p.formattedAddress ?? "",
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          city,
          country,
        };
      });
      return { results };
    } catch {
      return { results: [] as ClubResult[] };
    }
  });

export type ClubResult = {
  place_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
};

// ---------- Create ----------
const CreateInput = z.object({
  starts_at: z.string().min(1),
  club_name: z.string().min(1).max(200),
  club_address: z.string().max(400).nullable().optional(),
  club_place_id: z.string().max(200).nullable().optional(),
  club_lat: z.number().nullable().optional(),
  club_lng: z.number().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  level_min: z.enum(PADEL_LEVELS),
  level_max: z.enum(PADEL_LEVELS),
  gender_rule: z.enum(["mixed", "men_only", "women_only"]),
  extra_confirmed: z.number().int().min(0).max(3),
  note: z.string().max(500).nullable().optional(),
  playtomic_link: z.string().max(500).nullable().optional(),
  court_booked: z.boolean(),
});

export const createMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof CreateInput>) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { data: created, error } = await supabase
      .from("match_events")
      .insert({ ...data, host_profile_id: profile.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

// ---------- List open events ----------
export const listOpenEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { city?: string | null; needs?: number | null; myLocations?: boolean }) =>
    z.object({ city: z.string().nullable().optional(), needs: z.number().int().nullable().optional(), myLocations: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id, locations").eq("user_id", userId).maybeSingle();
    const myLocs = (profile?.locations ?? []).filter((l): l is string => typeof l === "string" && l.length > 0);
    if (data.myLocations && myLocs.length === 0) {
      return { events: [] as any[] };
    }
    let q = supabase
      .from("match_events")
      .select("*, participants:match_event_participants(profile_id, profiles(id, first_name, photo_url, gender, level))")
      .in("status", ["open", "full"])
      .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(500);
    if (data.myLocations && myLocs.length > 0) {
      q = q.in("city", myLocs);
    } else if (data.city) {
      q = q.ilike("city", `%${data.city}%`);
    }
    const { data: events, error } = await q;
    if (error) throw new Error(error.message);
    const list = (events ?? []).map((e: any) => {
      const filled = (e.participants?.length ?? 0) + (e.extra_confirmed ?? 0);
      const iAmHost = !!profile && e.host_profile_id === profile.id;
      const iAmParticipant = !!profile && ((e.participants ?? []).some((p: any) => p.profile_id === profile.id) || iAmHost);
      return { ...e, filled, needs: Math.max(0, 4 - filled), iAmHost, iAmParticipant };
    });
    return { events: data.needs ? list.filter((e) => e.needs === data.needs) : list };
  });

// ---------- Get one ----------
export const getMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id, gender").eq("user_id", userId).maybeSingle();
    const { data: event, error } = await supabase
      .from("match_events")
      .select("*, host:profiles!match_events_host_profile_id_fkey(id, first_name, photo_url), participants:match_event_participants(profile_id, joined_at, profiles(id, first_name, photo_url, gender, level))")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return { event: null };
    const filled = (event.participants?.length ?? 0) + (event.extra_confirmed ?? 0);
    const iAmHost = !!profile && event.host_profile_id === profile.id;
    const iAmParticipant = !!profile && ((event.participants ?? []).some((p: any) => p.profile_id === profile.id) || iAmHost);
    return {
      event: { ...event, filled, needs: Math.max(0, 4 - filled) },
      me: profile ? { id: profile.id, gender: profile.gender, iAmParticipant, iAmHost } : null,
    };
  });

// ---------- Join ----------
export const joinMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id, gender, first_name, level").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("Please add your name and padel level first.");
    if (!profile.first_name || !profile.level) throw new Error("Please add your name and padel level first.");
    const { data: event } = await supabase
      .from("match_events")
      .select("gender_rule, status, extra_confirmed")
      .eq("id", data.id)
      .maybeSingle();
    if (!event) throw new Error("Match not found");
    if (event.status !== "open") throw new Error("This match is no longer open");
    if (event.gender_rule === "men_only" && profile.gender && profile.gender !== "man") throw new Error("This match is for men only");
    if (event.gender_rule === "women_only" && profile.gender && profile.gender !== "woman") throw new Error("This match is for women only");
    const { count } = await supabase
      .from("match_event_participants")
      .select("id", { count: "exact", head: true })
      .eq("match_event_id", data.id);
    if ((count ?? 0) + (event.extra_confirmed ?? 0) >= 4) throw new Error("This match is full");
    const { error } = await supabase
      .from("match_event_participants")
      .insert({ match_event_id: data.id, profile_id: profile.id });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Leave ----------
export const leaveMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    await supabase
      .from("match_event_participants")
      .delete()
      .eq("match_event_id", data.id)
      .eq("profile_id", profile.id);
    // If it was full, re-open
    await supabase.from("match_events").update({ status: "open" }).eq("id", data.id).eq("status", "full");
    return { ok: true };
  });

// ---------- Cancel (host) ----------
export const cancelMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await supabase
      .from("match_events")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("host_profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Delete (host) ----------
export const deleteMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await supabase
      .from("match_events")
      .delete()
      .eq("id", data.id)
      .eq("host_profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Update (host) ----------
const UpdateInput = z.object({
  id: z.string().uuid(),
  starts_at: z.string().min(1).optional(),
  club_name: z.string().min(1).max(200).optional(),
  club_address: z.string().max(400).nullable().optional(),
  club_place_id: z.string().max(200).nullable().optional(),
  club_lat: z.number().nullable().optional(),
  club_lng: z.number().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  level_min: z.enum(PADEL_LEVELS).optional(),
  level_max: z.enum(PADEL_LEVELS).optional(),
  gender_rule: z.enum(["mixed", "men_only", "women_only"]).optional(),
  extra_confirmed: z.number().int().min(0).max(3).optional(),
  note: z.string().max(500).nullable().optional(),
  playtomic_link: z.string().max(500).nullable().optional(),
  court_booked: z.boolean().optional(),
  status: z.enum(["open", "full", "cancelled", "played"]).optional(),
});
export const updateMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof UpdateInput>) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { id, ...inputPatch } = data;
    const { data: current } = await supabase
      .from("match_events")
      .select("extra_confirmed")
      .eq("id", id)
      .eq("host_profile_id", profile.id)
      .maybeSingle();
    if (!current) throw new Error("Match not found");
    const { count } = await supabase
      .from("match_event_participants")
      .select("id", { count: "exact", head: true })
      .eq("match_event_id", id);
    const extraConfirmed = Math.min(
      inputPatch.extra_confirmed ?? current.extra_confirmed ?? 0,
      Math.max(0, 4 - (count ?? 0)),
    );
    const filled = (count ?? 0) + extraConfirmed;
    const patch = {
      ...inputPatch,
      extra_confirmed: extraConfirmed,
      status: inputPatch.status ?? (filled >= 4 ? "full" : "open"),
    };
    const { error } = await supabase
      .from("match_events")
      .update(patch)
      .eq("id", id)
      .eq("host_profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Chat: list + send + edit/delete ----------
export const listEventMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs, error } = await supabase
      .from("match_event_messages")
      .select("id, sender_profile_id, body, created_at, edited_at, sender:profiles!match_event_messages_sender_profile_id_fkey(first_name, photo_url)")
      .eq("match_event_id", data.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return { messages: msgs ?? [] };
  });

export const sendEventMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; body: string }) =>
    z.object({ id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await supabase
      .from("match_event_messages")
      .insert({ match_event_id: data.id, sender_profile_id: profile.id, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const editEventMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string; body: string }) =>
    z.object({ messageId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await supabase
      .from("match_event_messages")
      .update({ body: data.body, edited_at: new Date().toISOString() } as never)
      .eq("id", data.messageId)
      .eq("sender_profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEventMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string }) => z.object({ messageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await supabase
      .from("match_event_messages")
      .delete()
      .eq("id", data.messageId)
      .eq("sender_profile_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Public read: shareable match view (no auth) ----------
export const getPublicMatch = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: event, error } = await supabaseAdmin
      .from("match_events")
      .select("id, starts_at, club_name, club_address, city, country, gender_rule, level_min, level_max, note, court_booked, status, extra_confirmed, host:profiles!match_events_host_profile_id_fkey(first_name)")
      .eq("id", data.id)
      .in("status", ["open", "full"])
      .gt("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return { match: null };

    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("match_event_participants")
      .select("joined_at, profiles(first_name)")
      .eq("match_event_id", data.id)
      .order("joined_at", { ascending: true });
    if (participantsError) throw new Error(participantsError.message);

    const participantNames = (participants ?? [])
      .map((participant: any) => participant.profiles?.first_name)
      .filter((name: unknown): name is string => typeof name === "string" && name.length > 0);
    const extraConfirmed = event.extra_confirmed ?? 0;
    const filled = participantNames.length + extraConfirmed;

    return {
      match: {
        ...event,
        extra_confirmed: extraConfirmed,
        filled,
        participant_names: participantNames,
      } as PublicMatchView,
    };
  });

export type PublicMatchView = {
  id: string;
  starts_at: string;
  club_name: string;
  club_address: string | null;
  city: string | null;
  country: string | null;
  gender_rule: "mixed" | "men_only" | "women_only";
  level_min: string;
  level_max: string;
  note: string | null;
  court_booked: boolean;
  status: string;
  extra_confirmed: number;
  filled: number;
  host: { first_name: string } | null;
  participant_names: string[];
};

// ---------- Save "lite" profile: first_name + level (+ optional city) ----------
export const saveLiteProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { first_name: string; level: (typeof PADEL_LEVELS)[number]; city?: string | null }) =>
    z.object({
      first_name: z.string().trim().min(1).max(40),
      level: z.enum(PADEL_LEVELS),
      city: z.string().trim().max(120).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, onboarding_stage")
      .eq("user_id", userId)
      .maybeSingle();
    const nextStage = existing?.onboarding_stage === "complete" ? "complete" : "lite";
    if (existing) {
      const patch: Record<string, unknown> = {
        first_name: data.first_name,
        level: data.level,
        onboarding_stage: nextStage,
      };
      if (data.city) patch.locations = [data.city];
      const { error } = await supabase.from("profiles").update(patch as never).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const row: Record<string, unknown> = {
        user_id: userId,
        first_name: data.first_name,
        level: data.level,
        onboarding_stage: "lite",
        is_seed: false,
      };
      if (data.city) row.locations = [data.city];
      const { error } = await supabase.from("profiles").insert(row as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
