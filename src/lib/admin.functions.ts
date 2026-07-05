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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles" as never)
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

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

    const [profilesRes, matchesRes, likesRes, feedbackRes, reportsRes, allProfilesRes, recentFeedbackRes, authUsersRes] = await Promise.all([
      supabaseAdmin.from("profiles" as never).select("id", { count: "exact", head: true }).eq("is_seed", false),
      supabaseAdmin.from("matches" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("likes" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("feedback" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reports" as never).select("id", { count: "exact", head: true }),
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
        rating: number;
        message: string;
        created_at: string;
      }>,
    };
  });