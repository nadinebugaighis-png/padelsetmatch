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

// ---------- Quick create (one-tap from schedule grid) ----------
export const quickCreateMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { starts_at: string }) =>
    z.object({ starts_at: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, level, locations")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Please add your name and padel level first.");
    if (!profile.level) throw new Error("Please add your padel level first.");
    const level = profile.level as (typeof PADEL_LEVELS)[number];
    // Derive a default city from the user's first saved location if any.
    let city: string | null = null;
    const rawLocs = (profile.locations ?? []).filter(
      (l): l is string => typeof l === "string" && l.length > 0,
    );
    if (rawLocs[0]) {
      const parts = rawLocs[0].split("|").map((s) => s.trim()).filter(Boolean);
      city = parts[parts.length - 1] || parts[0] || null;
    }
    const { data: created, error } = await supabase
      .from("match_events")
      .insert({
        starts_at: data.starts_at,
        club_name: "TBD",
        club_address: null,
        club_place_id: null,
        club_lat: null,
        club_lng: null,
        city,
        country: null,
        level_min: level,
        level_max: level,
        gender_rule: "mixed",
        extra_confirmed: 0,
        note: null,
        playtomic_link: null,
        court_booked: false,
        host_profile_id: profile.id,
      })
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
    const rawLocs = (profile?.locations ?? []).filter((l): l is string => typeof l === "string" && l.length > 0);
    // Locations are typically stored as "Country | Region | City". Some rows
    // concatenate multiple locations without a separator, e.g.
    // "Spain | Madrid | La Moraleja Spain | Madrid | Alcobendas". Walk in
    // groups of 3 and collect BOTH the region (segment 2) and sub-area
    // (segment 3) as keywords so nearby suburbs still match.
    const keywords = new Set<string>();
    for (const raw of rawLocs) {
      const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length === 1) { keywords.add(parts[0]); continue; }
      for (let i = 0; i < parts.length; i += 3) {
        const country = parts[i];
        const region = parts[i + 1];
        const subcity = parts[i + 2];
        if (region) keywords.add(region);
        if (subcity) keywords.add(subcity);
        if (!region && !subcity && country) keywords.add(country);
      }
    }
    const myKeywords = Array.from(keywords);

    const sinceIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const baseSelect = "*, host:profiles!match_events_host_profile_id_fkey(first_name), participants:match_event_participants(profile_id, profiles(id, first_name, photo_url, gender, level))";

    // Always include events the user is involved in (host, participant, or invited),
    // regardless of city filter — otherwise a match joined via share link outside
    // their areas would disappear from their Play page.
    const involvedIds = new Set<string>();
    if (profile) {
      const [{ data: mine }, { data: parts }, { data: invs }] = await Promise.all([
        supabase.from("match_events").select("id").eq("host_profile_id", profile.id).gte("starts_at", sinceIso),
        supabase.from("match_event_participants").select("match_event_id, match_events!inner(id, starts_at)").eq("profile_id", profile.id).gte("match_events.starts_at", sinceIso),
        supabase.from("match_event_invites").select("match_event_id, match_events!inner(id, starts_at)").eq("invitee_profile_id", profile.id).gte("match_events.starts_at", sinceIso),
      ]);
      (mine ?? []).forEach((r: any) => involvedIds.add(r.id));
      (parts ?? []).forEach((r: any) => involvedIds.add(r.match_event_id));
      (invs ?? []).forEach((r: any) => involvedIds.add(r.match_event_id));
    }

    const eventsMap = new Map<string, any>();

    // Area / city query (main list)
    if (!(data.myLocations && myKeywords.length === 0)) {
      let q = supabase
        .from("match_events")
        .select(baseSelect)
        .in("status", ["open", "full"])
        .gte("starts_at", sinceIso)
        .order("starts_at", { ascending: true })
        .limit(500);
      if (data.myLocations && myKeywords.length > 0) {
        // Match against BOTH city and club_address so nearby suburbs surface
        // (e.g. user stored "Madrid" and event city is "Alcobendas" — the
        // address usually contains "Madrid").
        const safe = (s: string) => s.replace(/[,()]/g, " ").trim();
        const ors = myKeywords.flatMap((c) => {
          const s = safe(c);
          if (!s) return [];
          return [`city.ilike.%${s}%`, `club_address.ilike.%${s}%`, `club_name.ilike.%${s}%`];
        }).join(",");

        if (ors) q = q.or(ors);
      } else if (data.city) {
        q = q.ilike("city", `%${data.city}%`);
      }
      const { data: events, error } = await q;
      if (error) throw new Error(error.message);
      (events ?? []).forEach((e: any) => eventsMap.set(e.id, e));
    }

    // Merge in events the user is involved in but that weren't captured above
    const missingIds = Array.from(involvedIds).filter((id) => !eventsMap.has(id));
    if (missingIds.length > 0) {
      const { data: extra } = await supabase
        .from("match_events")
        .select(baseSelect)
        .in("id", missingIds)
        .in("status", ["open", "full"])
        .gte("starts_at", sinceIso);
      (extra ?? []).forEach((e: any) => eventsMap.set(e.id, e));
    }

    const merged = Array.from(eventsMap.values()).sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
    const list = merged.map((e: any) => {
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

    const { data: invitesRaw } = await supabase
      .from("match_event_invites")
      .select("id, invitee_profile_id, token, status, created_at, responded_at, invitee:profiles!match_event_invites_invitee_profile_id_fkey(id, first_name, photo_url, level)")
      .eq("match_event_id", data.id);
    const invites = invitesRaw ?? [];
    const myInvite = profile ? invites.find((i: any) => i.invitee_profile_id === profile.id) ?? null : null;
    const lockUntil = (event as any).invite_lock_until as string | null;
    const lockActive = !!lockUntil && new Date(lockUntil).getTime() > Date.now();

    return {
      event: { ...event, filled, needs: Math.max(0, 4 - filled), invites, invite_lock_until: lockUntil, lock_active: lockActive },
      me: profile ? { id: profile.id, gender: profile.gender, iAmParticipant, iAmHost, myInvite } : null,
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
      .select("gender_rule, status, extra_confirmed, invite_lock_until, host_profile_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!event) throw new Error("Match not found");
    if (event.status !== "open") throw new Error("This match is no longer open");
    if (event.gender_rule === "men_only" && profile.gender && profile.gender !== "man") throw new Error("This match is for men only");
    if (event.gender_rule === "women_only" && profile.gender && profile.gender !== "woman") throw new Error("This match is for women only");
    const lockUntil = (event as any).invite_lock_until as string | null;
    const lockActive = !!lockUntil && new Date(lockUntil).getTime() > Date.now();
    if (lockActive && event.host_profile_id !== profile.id) {
      const { data: inv } = await supabase
        .from("match_event_invites")
        .select("id, status")
        .eq("match_event_id", data.id)
        .eq("invitee_profile_id", profile.id)
        .maybeSingle();
      if (!inv) {
        throw new Error(`INVITE_LOCK:${lockUntil}`);
      }
      if (inv.status === "pending") {
        await supabase.from("match_event_invites").update({ status: "accepted", responded_at: new Date().toISOString() } as never).eq("id", inv.id);
      }
    }
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

// ---------- Duplicate (host) — copy match to another slot, keep participants ----------
export const duplicateMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; starts_at: string }) =>
    z.object({ id: z.string().uuid(), starts_at: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { data: src } = await supabase
      .from("match_events")
      .select("*")
      .eq("id", data.id)
      .eq("host_profile_id", profile.id)
      .maybeSingle();
    if (!src) throw new Error("Only the host can duplicate this match");
    const { data: created, error } = await supabase
      .from("match_events")
      .insert({
        starts_at: data.starts_at,
        club_name: src.club_name,
        club_address: src.club_address,
        club_place_id: src.club_place_id,
        club_lat: src.club_lat,
        club_lng: src.club_lng,
        city: src.city,
        country: src.country,
        level_min: src.level_min,
        level_max: src.level_max,
        gender_rule: src.gender_rule,
        extra_confirmed: src.extra_confirmed ?? 0,
        note: src.note,
        playtomic_link: src.playtomic_link,
        court_booked: false,
        host_profile_id: profile.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Copy participants
    const { data: parts } = await supabase
      .from("match_event_participants")
      .select("profile_id")
      .eq("match_event_id", data.id);
    const rows = (parts ?? []).map((p: any) => ({ match_event_id: created.id, profile_id: p.profile_id }));
    if (rows.length > 0) {
      await supabase.from("match_event_participants").insert(rows);
    }
    return { id: created.id };
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
    const { createClient } = await import("@supabase/supabase-js");
    const supabasePublic = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: view, error } = await supabasePublic.rpc("public_match_view" as never, { _event_id: data.id } as never);
    if (error) throw new Error(error.message);
    if (!view) return { match: null };
    const v = view as Record<string, unknown>;
    return {
      match: {
        ...v,
        extra_confirmed: (v.extra_confirmed as number) ?? 0,
        participant_names: (v.participant_names as string[]) ?? [],
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

// ---------- Invites ----------
const LOCK_HOURS = 10;

function lockCutoffIso(existing: string | null | undefined, startsAtIso: string): string {
  const now = Date.now();
  const startsAt = new Date(startsAtIso).getTime();
  const defaultCutoff = now + LOCK_HOURS * 60 * 60 * 1000;
  // Don't lock past the match start
  const cutoff = Math.min(defaultCutoff, startsAt);
  const existingMs = existing ? new Date(existing).getTime() : 0;
  return new Date(Math.max(existingMs, cutoff)).toISOString();
}

async function ensureLock(supabase: any, eventId: string) {
  const { data: ev } = await supabase
    .from("match_events")
    .select("invite_lock_until, starts_at")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return;
  const cutoff = lockCutoffIso(ev.invite_lock_until as string | null, ev.starts_at as string);
  if (ev.invite_lock_until !== cutoff) {
    await supabase.from("match_events").update({ invite_lock_until: cutoff } as never).eq("id", eventId);
  }
}

async function assertHost(supabase: any, userId: string, eventId: string): Promise<string> {
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!profile) throw new Error("No profile");
  const { data: ev } = await supabase.from("match_events").select("host_profile_id").eq("id", eventId).maybeSingle();
  if (!ev || ev.host_profile_id !== profile.id) throw new Error("Only the host can do that");
  return profile.id;
}

// Invite existing players by profile id
export const inviteToMatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string; profileIds: string[] }) =>
    z.object({ eventId: z.string().uuid(), profileIds: z.array(z.string().uuid()).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const hostId = await assertHost(supabase, userId, data.eventId);
    const rows = data.profileIds
      .filter((pid) => pid !== hostId)
      .map((pid) => ({
        match_event_id: data.eventId,
        inviter_profile_id: hostId,
        invitee_profile_id: pid,
        status: "pending" as const,
      }));
    if (rows.length === 0) return { invited: 0 };
    const { error } = await supabase
      .from("match_event_invites")
      .upsert(rows as never, { onConflict: "match_event_id,invitee_profile_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    await ensureLock(supabase, data.eventId);
    return { invited: rows.length };
  });

// Create a shareable invite link (token)
export const createMatchInviteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const hostId = await assertHost(supabase, userId, data.eventId);
    const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 8);
    const { data: row, error } = await supabase
      .from("match_event_invites")
      .insert({
        match_event_id: data.eventId,
        inviter_profile_id: hostId,
        invitee_profile_id: null,
        token,
        status: "pending",
      } as never)
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    await ensureLock(supabase, data.eventId);
    return { id: row.id, token: row.token as string };
  });

// Respond to invite (accept / decline)
export const respondToMatchInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string; accept: boolean }) =>
    z.object({ inviteId: z.string().uuid(), accept: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id, gender, first_name, level").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { data: invite } = await supabase
      .from("match_event_invites")
      .select("id, match_event_id, invitee_profile_id, status")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (!invite) throw new Error("Invite not found");
    if (invite.invitee_profile_id !== profile.id) throw new Error("This invite isn't yours");

    if (data.accept) {
      if (!profile.first_name || !profile.level) {
        throw new Error("Please add your name and padel level first.");
      }
      const { data: ev } = await supabase
        .from("match_events")
        .select("gender_rule, status, extra_confirmed")
        .eq("id", invite.match_event_id)
        .maybeSingle();
      if (!ev) throw new Error("Match not found");
      if (ev.status === "cancelled") throw new Error("This match was cancelled");
      if (ev.status === "played") throw new Error("This match already happened");
      if (ev.gender_rule === "men_only" && profile.gender && profile.gender !== "man") {
        throw new Error("This match is for men only");
      }
      if (ev.gender_rule === "women_only" && profile.gender && profile.gender !== "woman") {
        throw new Error("This match is for women only");
      }
      const { count } = await supabase
        .from("match_event_participants")
        .select("id", { count: "exact", head: true })
        .eq("match_event_id", invite.match_event_id);
      // Allow accept even if event is 'full' as long as an actual slot exists
      // (accounting for extra_confirmed placeholders). This keeps invited
      // players prioritized when the host set extra_confirmed.
      if ((count ?? 0) + (ev.extra_confirmed ?? 0) >= 4) {
        // Try to reclaim a placeholder slot for the invited player.
        const canReclaim = (ev.extra_confirmed ?? 0) > 0 && (count ?? 0) < 4;
        if (canReclaim) {
          await supabase
            .from("match_events")
            .update({ extra_confirmed: (ev.extra_confirmed ?? 0) - 1 } as never)
            .eq("id", invite.match_event_id);
        } else {
          throw new Error("This match is already full");
        }
      }
      const { error: insErr } = await supabase
        .from("match_event_participants")
        .insert({ match_event_id: invite.match_event_id, profile_id: profile.id } as never);
      if (insErr && !insErr.message.includes("duplicate")) {
        throw new Error(insErr.message);
      }
    }

    const newStatus = data.accept ? "accepted" : "declined";
    const { error: updErr } = await supabase
      .from("match_event_invites")
      .update({ status: newStatus, responded_at: new Date().toISOString() } as never)
      .eq("id", invite.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true, eventId: invite.match_event_id };
  });

// Accept a token-based invite (from WhatsApp link)
export const claimMatchInviteByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(8).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) throw new Error("Please finish your profile first");
    const { data: invite } = await supabase
      .from("match_event_invites")
      .select("id, match_event_id, invitee_profile_id, status")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Invite link is invalid or expired");
    // If unclaimed, claim it for this user
    if (!invite.invitee_profile_id) {
      const { data: existing } = await supabase
        .from("match_event_invites")
        .select("id")
        .eq("match_event_id", invite.match_event_id)
        .eq("invitee_profile_id", profile.id)
        .maybeSingle();
      if (existing) {
        // Already have a direct invite — remove token row
        await supabase.from("match_event_invites").delete().eq("id", invite.id);
        return { ok: true, eventId: invite.match_event_id, inviteId: existing.id };
      }
      await supabase
        .from("match_event_invites")
        .update({ invitee_profile_id: profile.id } as never)
        .eq("id", invite.id);
    }
    return { ok: true, eventId: invite.match_event_id, inviteId: invite.id };
  });

// Revoke an invite (host)
export const revokeMatchInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string }) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("match_event_invites").delete().eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Suggest people to invite: my matches + friends
export const listInvitableConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) return { people: [] as any[] };

    const [{ data: matches }, { data: friends }, { data: alreadyInvited }, { data: participants }] = await Promise.all([
      supabase
        .from("matches")
        .select("profile_a, profile_b, a:profiles!matches_profile_a_fkey(id, first_name, photo_url, level, gender), b:profiles!matches_profile_b_fkey(id, first_name, photo_url, level, gender)")
        .or(`profile_a.eq.${profile.id},profile_b.eq.${profile.id}`),
      supabase
        .from("friendships")
        .select("requester_profile_id, addressee_profile_id, status, requester:profiles!friendships_requester_profile_id_fkey(id, first_name, photo_url, level, gender), addressee:profiles!friendships_addressee_profile_id_fkey(id, first_name, photo_url, level, gender)")
        .eq("status", "accepted")
        .or(`requester_profile_id.eq.${profile.id},addressee_profile_id.eq.${profile.id}`),
      supabase.from("match_event_invites").select("invitee_profile_id").eq("match_event_id", data.eventId),
      supabase.from("match_event_participants").select("profile_id").eq("match_event_id", data.eventId),
    ]);

    const seen = new Set<string>();
    const people: Array<{ id: string; first_name: string | null; photo_url: string | null; level: string | null; gender: string | null }> = [];
    const push = (p: any) => {
      if (!p || !p.id || p.id === profile.id) return;
      if (seen.has(p.id)) return;
      seen.add(p.id);
      people.push({ id: p.id, first_name: p.first_name ?? null, photo_url: p.photo_url ?? null, level: p.level ?? null, gender: p.gender ?? null });
    };
    (matches ?? []).forEach((m: any) => {
      push(m.profile_a === profile.id ? m.b : m.a);
    });
    (friends ?? []).forEach((f: any) => {
      push(f.requester_profile_id === profile.id ? f.addressee : f.requester);
    });

    const invitedIds = new Set((alreadyInvited ?? []).map((r: any) => r.invitee_profile_id).filter(Boolean));
    const participantIds = new Set((participants ?? []).map((r: any) => r.profile_id));
    return {
      people: people.map((p) => ({
        ...p,
        invited: invitedIds.has(p.id),
        joined: participantIds.has(p.id),
      })),
    };
  });

// List my pending invites (for a notification badge / list)
export const listMyPendingInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) return { invites: [] as any[] };
    const { data } = await supabase
      .from("match_event_invites")
      .select("id, status, created_at, event:match_events!match_event_invites_match_event_id_fkey(id, starts_at, club_name, city, status, host:profiles!match_events_host_profile_id_fkey(first_name))")
      .eq("invitee_profile_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    return { invites: data ?? [] };
  });

const SHORT_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeShortCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => SHORT_ALPHABET[b % SHORT_ALPHABET.length])
    .join("");
}


// Create a short redirect link for any URL (used for match invites / shares)
export const createShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUrl: string }) => z.object({ targetUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let code = makeShortCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: row, error } = await supabase
        .from("short_links")
        .insert({ code, target_url: data.targetUrl })
        .select("code")
        .single();
      if (row) return { code: row.code, shortUrl: `/s/${row.code}` };
      if (error?.code === "23505") {
        code = makeShortCode();
        continue;
      }
      if (error) throw new Error(error.message);
    }
    throw new Error("Could not create short link");
  });

