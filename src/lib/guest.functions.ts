import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Public (anon) Supabase client for guest RPCs — no session persistence.
function guestClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const uuid = z.string().uuid();

export const guestJoinMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: uuid,
        displayName: z.string().trim().min(1).max(40),
        level: z.enum(["casual", "beginner", "intermediate", "advanced", "competitive"]),
        phone: z.string().trim().min(4).max(32),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = guestClient();
    const { data: res, error } = await sb.rpc("guest_join_match" as never, {
      _event_id: data.eventId,
      _display_name: data.displayName,
      _level: data.level,
      _phone: data.phone,
    } as never);
    if (error) throw new Error(error.message);
    return res as { guest_id: string; token: string };
  });

export const guestLeaveMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ eventId: uuid, token: uuid }).parse(d))
  .handler(async ({ data }) => {
    const sb = guestClient();
    const { error } = await sb.rpc("guest_leave_match" as never, {
      _event_id: data.eventId,
      _token: data.token,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const guestSendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ eventId: uuid, token: uuid, body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = guestClient();
    const { data: res, error } = await sb.rpc("guest_send_message" as never, {
      _event_id: data.eventId,
      _token: data.token,
      _body: data.body,
    } as never);
    if (error) throw new Error(error.message);
    return { id: res as string };
  });

export const guestGetRoom = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ eventId: uuid, token: uuid }).parse(d))
  .handler(async ({ data }) => {
    const sb = guestClient();
    const { data: res, error } = await sb.rpc("guest_get_room" as never, {
      _event_id: data.eventId,
      _token: data.token,
    } as never);
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      match?: {
        id: string;
        starts_at: string;
        club_name: string | null;
        club_address: string | null;
        city: string | null;
        gender_rule: string;
        level_min: string;
        level_max: string;
        note: string | null;
        status: string;
        filled: number;
        host: { first_name: string | null } | null;
        participant_names: string[];
      };
      messages?: Array<{ id: string; body: string; created_at: string; sender_name: string; is_guest: boolean; is_me: boolean }>;
      guest?: { id: string; display_name: string };
    };
  });

export const listPublicUpcomingMatches = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).optional() }).optional().parse(d) ?? {})
  .handler(async ({ data }) => {
    const sb = guestClient();
    const { data: res, error } = await sb.rpc("list_public_upcoming_matches" as never, {
      _limit: data?.limit ?? 40,
    } as never);
    if (error) throw new Error(error.message);
    return (res as Array<{
      id: string;
      starts_at: string;
      club_name: string | null;
      city: string | null;
      club_address: string | null;
      level_min: string;
      level_max: string;
      gender_rule: string;
      filled: number;
      host_name: string | null;
    }>) ?? [];
  });
