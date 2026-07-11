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
    const { sendWebPush } = await import("./push.server");
    const { data: claimed, error } = await context.supabase.rpc("claim_push_outbox" as never, { _limit: 50 } as never);
    if (error) throw new Error(error.message);
    type Item = { id: string; profile_id: string; title: string; body: string | null; url: string | null; type: string; subs: Array<{ endpoint: string; p256dh: string; auth: string }> };
    const items = ((claimed as { items?: Item[] } | null)?.items ?? []) as Item[];
    if (items.length === 0) return { sent: 0 };
    let sent = 0;
    const expiredEndpoints: string[] = [];
    for (const item of items) {
      for (const sub of item.subs) {
        try {
          const r = await sendWebPush(sub, { title: item.title, body: item.body ?? undefined, url: item.url ?? undefined, type: item.type });
          if (r.expired) expiredEndpoints.push(sub.endpoint);
          if (r.ok) sent += 1;
        } catch (e) {
          console.warn("push send failed", e);
        }
      }
    }
    if (expiredEndpoints.length > 0) {
      await context.supabase.rpc("delete_expired_push_subs" as never, { _endpoints: expiredEndpoints } as never);
    }
    return { sent };
  });
