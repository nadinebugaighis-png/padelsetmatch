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

export const setCoachFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ is_coach: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles" as never)
      .update({ is_coach: data.is_coach } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endorseCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        coach_profile_id: z.string().uuid(),
        stars: z.number().int().min(1).max(5),
        comment: z.string().trim().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    if (meId === data.coach_profile_id) throw new Error("You can't endorse yourself.");

    // Verify target is a coach
    const { data: coach } = await context.supabase
      .from("profiles" as never)
      .select("id, is_coach")
      .eq("id", data.coach_profile_id)
      .maybeSingle();
    if (!coach || !(coach as { is_coach: boolean }).is_coach) {
      throw new Error("This player isn't listed as a coach.");
    }

    const payload = {
      coach_profile_id: data.coach_profile_id,
      student_profile_id: meId,
      stars: data.stars,
      comment: data.comment?.trim() || null,
      status: "pending" as const,
    };
    const { error } = await context.supabase
      .from("coach_endorsements" as never)
      .upsert(payload as never, { onConflict: "coach_profile_id,student_profile_id" } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondCoachEndorsement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        endorsement_id: z.string().uuid(),
        approve: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("coach_endorsements" as never)
      .update({ status: data.approve ? "approved" : "rejected" } as never)
      .eq("id", data.endorsement_id)
      .eq("coach_profile_id", meId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyCoachEndorsements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("coach_endorsements" as never)
      .select("id, status, stars, comment, created_at, student_profile_id, coach_profile_id")
      .eq("coach_profile_id", meId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      status: "pending" | "approved" | "rejected";
      stars: number | null;
      comment: string | null;
      created_at: string;
      student_profile_id: string;
      coach_profile_id: string;
    }>;
  });

export const getMyEndorsementFor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ coach_profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const meId = await myProfileId(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("coach_endorsements" as never)
      .select("id, status, stars, comment")
      .eq("coach_profile_id", data.coach_profile_id)
      .eq("student_profile_id", meId)
      .maybeSingle();
    return (row ?? null) as null | {
      id: string;
      status: "pending" | "approved" | "rejected";
      stars: number | null;
      comment: string | null;
    };
  });

export const getCoachStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ coach_profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: stats, error } = await context.supabase.rpc("coach_stats" as never, {
      _coach_profile_id: data.coach_profile_id,
    } as never);
    if (error) throw new Error(error.message);
    return (stats ?? { count: 0, average: 0, comments: [] }) as {
      count: number;
      average: number;
      comments: Array<{ stars: number; comment: string; approved_at: string }>;
    };
  });

export const openCoachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ coach_profile_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: matchId, error } = await context.supabase.rpc("open_coach_chat" as never, {
      _coach_profile_id: data.coach_profile_id,
    } as never);
    if (error) throw new Error(error.message);
    return { match_id: matchId as unknown as string };
  });
