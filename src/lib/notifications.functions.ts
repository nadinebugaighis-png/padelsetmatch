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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
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
      .order("created_at", { ascending: false })
      .limit(50);
    const items = data ?? [];
    const unread = items.filter((i) => !i.read_at).length;
    return { items, unread };
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
export const drainPushOutbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("./push.server");
    const { data: pending } = await supabaseAdmin
      .from("push_outbox")
      .select("id, profile_id, title, body, url, type")
      .is("sent_at", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (!pending || pending.length === 0) return { sent: 0 };
    const byProfile = new Map<string, typeof pending>();
    for (const p of pending) {
      const arr = byProfile.get(p.profile_id) ?? [];
      arr.push(p);
      byProfile.set(p.profile_id, arr);
    }
    let sent = 0;
    const expiredEndpoints: string[] = [];
    for (const [profileId, items] of byProfile) {
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("profile_id", profileId);
      if (!subs || subs.length === 0) continue;
      for (const item of items) {
        for (const sub of subs) {
          try {
            const r = await sendWebPush(sub, { title: item.title, body: item.body ?? undefined, url: item.url ?? undefined, type: item.type });
            if (r.expired) expiredEndpoints.push(sub.endpoint);
            if (r.ok) sent += 1;
          } catch (e) {
            console.warn("push send failed", e);
          }
        }
      }
    }
    const doneIds = pending.map((p) => p.id);
    if (doneIds.length > 0) await supabaseAdmin.from("push_outbox").update({ sent_at: new Date().toISOString() }).in("id", doneIds);
    if (expiredEndpoints.length > 0) await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    return { sent };
  });
