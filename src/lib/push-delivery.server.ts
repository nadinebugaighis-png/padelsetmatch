import { sendWebPush } from "./push.server";
import { sendNativePush } from "./apns.server";

/** Privileged background delivery; never return recipients or tokens to clients. */
export async function deliverPendingPushes() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("claim_pending_push_delivery", { _limit: 25 });
  if (error) throw new Error("Could not claim notifications");
  type Item = { id: string; profile_id: string; title: string; body: string | null; url: string | null; type: string;
    subs: Array<{ endpoint: string; p256dh: string; auth: string }>;
    devices: Array<{ token: string; platform: string }> };
  const items = (data as unknown as { items?: Item[] } | null)?.items ?? [];
  let sent = 0;
  for (const item of items) {
    let retry = false;
    let attempted = false;
    const message = { title: item.title, body: item.body ?? undefined, url: item.url ?? undefined, type: item.type };
    for (const sub of item.subs) {
      attempted = true;
      try {
        const result = await sendWebPush(sub, message);
        if (result.ok) sent++;
        else if (!result.expired) retry = true;
        if (result.expired) await supabaseAdmin.from("push_subscriptions").delete().eq("profile_id", item.profile_id).eq("endpoint", sub.endpoint);
      } catch { retry = true; }
    }
    for (const device of item.devices.filter((d) => d.platform === "ios")) {
      attempted = true;
      const result = await sendNativePush(device.token, message);
      if (result.ok) sent++;
      else if (!result.invalidToken) retry = true;
      if (result.invalidToken) await supabaseAdmin.from("device_tokens").delete().eq("profile_id", item.profile_id).eq("token", device.token);
    }
    if (attempted && !retry) {
      await supabaseAdmin.from("push_outbox").update({ sent_at: new Date().toISOString() }).eq("id", Number(item.id));
    }
  }
  return { sent };
}