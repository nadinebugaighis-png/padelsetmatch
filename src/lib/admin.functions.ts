import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type AdminContext = { supabase: { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> } };

async function assertAdmin(context: AdminContext) {
  const { data, error } = await context.supabase.rpc("is_current_user_admin");
  if (error || data !== true) throw new Error("Forbidden");
}

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("is_current_user_admin");
    if (error) return false;
    return data === true;
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("admin_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as {
      counts: { users: number; signups: number; incomplete: number; matches: number; likes: number; feedback: number; reports: number };
      allSignups: Array<{
        user_id: string; email: string | null; signed_up_at: string; last_sign_in_at: string | null;
        email_confirmed: boolean; profile_completed: boolean; onboarding_stage: string | null;
        first_name: string | null; age: number | null; zone: string | null; suspended: boolean;
      }>;
      recentFeedback: Array<{ id: string; rating: number | null; message: string; created_at: string }>;
      recentReports: Array<{
        id: string; reporter_profile_id: string; reported_profile_id: string; reason: string; category: string | null;
        status: string; created_at: string; reporter_name: string | null; reported_name: string | null;
        reported_photo_url: string | null; reported_suspended: boolean;
      }>;
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
    const { error } = await (context.supabase as any).rpc("admin_resolve_report", {
      _report_id: data.reportId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const adminClearProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ profileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).rpc("admin_clear_profile_photo", {
      _profile_id: data.profileId,
    });
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
    const { error } = await (context.supabase as any).rpc("admin_set_suspended", {
      _profile_id: data.profileId,
      _suspend: data.suspend,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
