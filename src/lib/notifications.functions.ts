import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env.VAPID_PUBLIC_KEY ?? "" };
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
});

export const saveMyPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subscribeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    await context.supabase
      .from("push_subscriptions")
      .upsert(
        {
          profile_id: profile.id,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    return { ok: true };
  });

export const removeMyPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ endpoint: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

const deviceTokenSchema = z.object({
  token: z.string().min(16).max(512),
  platform: z.enum(["ios", "android"]),
});

export const saveMyDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deviceTokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    const { error } = await context.supabase
      .from("device_tokens")
      .upsert(
        { profile_id: profile.id, platform: data.platform, token: data.token, last_used_at: new Date().toISOString() },
        { onConflict: "token" },
      );
    if (error) throw new Error("Could not register this device for notifications");
    return { ok: true };
  });

export const removeMyDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ token: z.string().min(16).max(512) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) return { ok: true };
    await context.supabase.from("device_tokens").delete().eq("token", data.token).eq("profile_id", profile.id);
    return { ok: true };
  });

export const getMyNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) return null;
    const { data } = await context.supabase.from("notification_prefs").select("*").eq("profile_id", profile.id).maybeSingle();
    return data ?? {
      profile_id: profile.id,
      messages: true, matches: true, connect_activity: true, coach_requests: true, match_participants: true,
    };
  });

const prefsSchema = z.object({
  messages: z.boolean(),
  matches: z.boolean(),
  connect_activity: z.boolean(),
  coach_requests: z.boolean(),
  match_participants: z.boolean(),
});

export const updateMyNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => prefsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) throw new Error("No profile");
    await context.supabase.from("notification_prefs").upsert({ profile_id: profile.id, ...data, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) return { items: [], unread: 0 };
    const { data } = await context.supabase
      .from("notifications")
      .select("id, type, title, body, url, read_at, created_at")
      .eq("profile_id", profile.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    const items = data ?? [];
    return { items, unread: items.length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ids: z.array(z.string()).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("id").eq("user_id", context.userId).maybeSingle();
    if (!profile) return { ok: true };
    const q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", profile.id).is("read_at", null);
    if (data.ids && data.ids.length > 0) await q.in("id", data.ids);
    else await q;
    return { ok: true };
  });

// Drain pending pushes. Idempotent, safe to call opportunistically.
// Uses a SECURITY DEFINER RPC to atomically claim rows (no service key needed).
export const drainPushOutbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // This authenticated caller triggers delivery but cannot choose recipients
    // or read them; the privileged helper returns aggregate counts only.
    const { deliverPendingPushes } = await import("./push-delivery.server");
    return deliverPendingPushes();
  });
