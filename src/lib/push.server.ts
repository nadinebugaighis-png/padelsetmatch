// Server-side Web Push sender using @block65/webcrypto-web-push (Workers-compatible)
import { buildPushPayload, type VapidKeys, type PushSubscription as WPSubscription, type PushMessage } from "@block65/webcrypto-web-push";

function getVapid(): VapidKeys {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Missing VAPID keys");
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "mailto:hello@padelmatchapp.lovable.app" };
}

export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  message: { title: string; body?: string; url?: string; type?: string },
): Promise<{ ok: boolean; status: number; expired: boolean }> {
  const subscription: WPSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
  const payload: PushMessage = { data: JSON.stringify(message), options: { ttl: 60 * 60 * 24 } };
  const req = await buildPushPayload(payload, subscription, getVapid());
  const res = await fetch(subscription.endpoint, req);
  const expired = res.status === 404 || res.status === 410;
  return { ok: res.ok, status: res.status, expired };
}
