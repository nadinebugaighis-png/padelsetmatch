import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { userId: string; supabase: { from: (t: string) => any } }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) return false;
    return Boolean(data);
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !role) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, matchesRes, likesRes, feedbackRes, reportsRes, allProfilesRes, recentFeedbackRes, recentReportsRes, authUsersRes] = await Promise.all([
      supabaseAdmin.from("profiles" as never).select("id", { count: "exact", head: true }).eq("is_seed", false),
      supabaseAdmin.from("matches" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("likes" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("feedback" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reports" as never).select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin
        .from("profiles" as never)
        .select("id, user_id, first_name, age, zone, created_at, suspended_at")
        .eq("is_seed", false)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("feedback" as never)
        .select("id, rating, message, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("reports" as never)
        .select("id, reporter_profile_id, reported_profile_id, reason, category, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    type ProfileRow = {
      id: string;
      user_id: string;
      first_name: string | null;
      age: number | null;
      zone: string | null;
      created_at: string;
      suspended_at: string | null;
    };

    const profileRows = (allProfilesRes.data ?? []) as ProfileRow[];
    const profilesByUser = new Map(profileRows.map((p) => [p.user_id, p]));

    const authUsers = authUsersRes.data?.users ?? [];
    const allSignups = authUsers
      .map((u) => {
        const p = profilesByUser.get(u.id);
        return {
          user_id: u.id,
          email: u.email ?? null,
          signed_up_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed: Boolean(u.email_confirmed_at),
          profile_completed: Boolean(p),
          first_name: p?.first_name ?? null,
          age: p?.age ?? null,
          zone: p?.zone ?? null,
          suspended: Boolean(p?.suspended_at),
        };
      })
      .sort((a, b) => (b.signed_up_at ?? "").localeCompare(a.signed_up_at ?? ""));

    type ReportRow = {
      id: string;
      reporter_profile_id: string;
      reported_profile_id: string;
      reason: string;
      category: string | null;
      status: string;
      created_at: string;
    };
    const reportRows = ((recentReportsRes.data ?? []) as ReportRow[]);
    const involvedIds = Array.from(
      new Set(reportRows.flatMap((r) => [r.reporter_profile_id, r.reported_profile_id])),
    );
    let nameMap = new Map<string, { first_name: string | null; photo_url: string | null; suspended_at: string | null }>();
    if (involvedIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles" as never)
        .select("id, first_name, photo_url, suspended_at")
        .in("id", involvedIds);
      ((profs as Array<{ id: string; first_name: string | null; photo_url: string | null; suspended_at: string | null }> | null) ?? []).forEach((p) => {
        nameMap.set(p.id, { first_name: p.first_name, photo_url: p.photo_url, suspended_at: p.suspended_at });
      });
    }
    const recentReports = reportRows.map((r) => ({
      ...r,
      reporter_name: nameMap.get(r.reporter_profile_id)?.first_name ?? null,
      reported_name: nameMap.get(r.reported_profile_id)?.first_name ?? null,
      reported_photo_url: nameMap.get(r.reported_profile_id)?.photo_url ?? null,
      reported_suspended: Boolean(nameMap.get(r.reported_profile_id)?.suspended_at),
    }));

    return {
      counts: {
        users: profilesRes.count ?? 0,
        signups: authUsers.length,
        incomplete: authUsers.length - profileRows.length,
        matches: matchesRes.count ?? 0,
        likes: likesRes.count ?? 0,
        feedback: feedbackRes.count ?? 0,
        reports: reportsRes.count ?? 0,
      },
      allSignups,
      recentFeedback: (recentFeedbackRes.data ?? []) as Array<{
        id: string;
        rating: number | null;
        message: string;
        created_at: string;
      }>,
      recentReports,
    };
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      reportId: z.string().uuid(),
      status: z.enum(["resolved", "dismissed", "pending"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Look up the report so we can undo the auto-block created when it was filed.
    const { data: rep } = await supabaseAdmin
      .from("reports" as never)
      .select("reporter_profile_id, reported_profile_id")
      .eq("id", data.reportId)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("reports" as never)
      .update({ status: data.status, reviewed_at: new Date().toISOString() } as never)
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);
    // On resolve/dismiss, remove the reporter's auto-block so the reported user
    // can reappear in the reporter's Grid. Keep pending reports blocked.
    const r = rep as { reporter_profile_id: string; reported_profile_id: string } | null;
    if (r && (data.status === "resolved" || data.status === "dismissed")) {
      await supabaseAdmin
        .from("blocks" as never)
        .delete()
        .eq("blocker_profile_id", r.reporter_profile_id)
        .eq("blocked_profile_id", r.reported_profile_id);
    }
    return { ok: true };
  });


export const adminClearProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ profileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles" as never)
      .update({
        photo_url: null,
        photo_moderation_status: "rejected",
        photo_moderation_reason: "admin_removed",
      } as never)
      .eq("id", data.profileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ profileId: z.string().uuid(), suspend: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles" as never)
      .update({ suspended_at: data.suspend ? new Date().toISOString() : null } as never)
      .eq("id", data.profileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
