// Server-side APNs (Apple Push Notification service) sender.
// Token-based auth: ES256 JWT signed with the .p8 key from Apple Developer.
// Uses only WebCrypto + fetch, so it runs in the Worker runtime. APNs requires
// HTTP/2, which the production runtime's proxy stack negotiates; local dev
// cannot reach APNs and sendNativePush will return { ok: false } there.

const BUNDLE_ID = "com.moorisharches.padelsetmatch";

function base64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface ApnsConfig {
  teamId: string;
  keyId: string;
  signingKey: string; // PEM contents of the .p8 file
}

function getConfig(): ApnsConfig | null {
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const signingKey = process.env.APNS_AUTH_KEY;
  if (!teamId || !keyId || !signingKey) return null;
  return { teamId, keyId, signingKey };
}

let cachedJwt: { token: string; issuedAt: number } | null = null;

async function apnsJwt(cfg: ApnsConfig): Promise<string> {
  // APNs tokens are valid for up to 60 minutes; refresh every 50.
  if (cachedJwt && Date.now() - cachedJwt.issuedAt < 50 * 60 * 1000) return cachedJwt.token;
  const pem = cfg.signingKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const claims = base64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(Date.now() / 1000) }));
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${claims}`));
  const token = `${header}.${claims}.${base64url(signature)}`;
  cachedJwt = { token, issuedAt: Date.now() };
  return token;
}

export async function sendNativePush(
  deviceToken: string,
  message: { title: string; body?: string; url?: string; type?: string },
): Promise<{ ok: boolean; status: number; invalidToken: boolean }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, status: 0, invalidToken: false };
  try {
    const jwt = await apnsJwt(cfg);
    const res = await fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: { alert: { title: message.title, body: message.body ?? "" }, sound: "default" },
        url: message.url ?? null,
        type: message.type ?? null,
      }),
    });
    // 400 BadDeviceToken / 410 Unregistered mean the token will never work again.
    const result = res.ok ? null : await res.json().catch(() => null) as { reason?: string } | null;
    const invalidToken = res.status === 410 || (res.status === 400 && result?.reason === "BadDeviceToken");
    return { ok: res.ok, status: res.status, invalidToken };
  } catch {
    // Local dev cannot open an HTTP/2 connection to APNs — expected there.
    console.warn("Apple notification delivery unavailable");
    return { ok: false, status: 0, invalidToken: false };
  }
}
