import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: unknown }) {
  const { data, error } = await (context.supabase as any).rpc("is_current_user_admin");
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

export const getAdminHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [crashesRes, eventsRes, alertsRes] = await Promise.all([
      sb.from("app_events")
        .select("id,created_at,kind,name,message,stack,route,platform,app_version,session_id")
        .in("kind", ["crash", "error"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),
      sb.from("app_events")
        .select("name,kind,platform,session_id,created_at")
        .in("kind", ["event", "screen"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000),
      sb.from("app_alerts")
        .select("id,kind,title,body,created_at,acknowledged_at")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (crashesRes.error) throw new Error(crashesRes.error.message);
    if (eventsRes.error) throw new Error(eventsRes.error.message);
    if (alertsRes.error) throw new Error(alertsRes.error.message);

    const crashes = (crashesRes.data ?? []) as Array<{
      id: string; created_at: string; kind: string; name: string; message: string | null;
      stack: string | null; route: string | null; platform: string | null; app_version: string | null; session_id: string | null;
    }>;
    const events = (eventsRes.data ?? []) as Array<{ name: string; kind: string; platform: string | null; session_id: string | null }>;

    const tally = (rows: Array<{ name: string }>) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.name, (m.get(r.name) ?? 0) + 1);
      return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    };

    const sessions = new Set(events.map((e) => e.session_id).filter(Boolean));
    const crashSessions = new Set(crashes.map((c) => c.session_id).filter(Boolean));
    const byPlatform = tally(events.map((e) => ({ name: e.platform ?? "unknown" }))).slice(0, 6);

    return {
      alerts: (alertsRes.data ?? []) as Array<{
        id: string; kind: string; title: string; body: string | null; created_at: string;
      }>,
      sinceDays: 7,
      sessions: sessions.size,
      crashCount: crashes.filter((c) => c.kind === "crash").length,
      errorCount: crashes.filter((c) => c.kind === "error").length,
      crashFreeRate: sessions.size ? Math.round((1 - crashSessions.size / sessions.size) * 1000) / 10 : 100,
      topCrashes: tally(crashes.map((c) => ({ name: `${c.name}: ${c.message ?? ""}`.slice(0, 120) }))).slice(0, 8),
      topScreens: tally(events.filter((e) => e.kind === "screen")).slice(0, 8),
      topEvents: tally(events.filter((e) => e.kind === "event")).slice(0, 8),
      byPlatform,
      recent: crashes.slice(0, 25),
    };
  });

export const adminAckAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ alertId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).rpc("admin_ack_app_alert", {
      _alert_id: data.alertId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fetch the actual post/comment/message behind a content report. */
export const adminGetReportedContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ kind: z.enum(["post", "comment", "message"]), contentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await (context.supabase as any).rpc("admin_get_reported_content", {
      _kind: data.kind,
      _id: data.contentId,
    });
    if (error) throw new Error(error.message);
    return row as {
      kind: string; id: string; exists: boolean;
      body?: string; created_at?: string; author_profile_id?: string; author_name?: string | null;
    };
  });

/** Remove reported content (post/comment deleted, message redacted). */
export const adminDeleteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ kind: z.enum(["post", "comment", "message"]), contentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).rpc("admin_delete_content", {
      _kind: data.kind,
      _id: data.contentId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
