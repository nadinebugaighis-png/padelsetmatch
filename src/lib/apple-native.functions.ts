import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** The iOS app's bundle ID: Apple puts it in the token audience for the native sheet. */
const IOS_BUNDLE_ID = "com.moorisharches.padelsetmatch";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Native iOS Sign in with Apple. The web provider is configured with the web
 * Services ID only (the sign-in broker cannot take two IDs), so the auth
 * service rejects native tokens whose audience is the bundle ID. We verify the
 * Apple token here (signature, issuer, audience, expiry, nonce) and hand back a
 * one-time login code the app exchanges for a normal session.
 */
export const exchangeNativeAppleToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ identityToken: z.string().min(20).max(8000), nonce: z.string().min(8).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const jwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(data.identityToken, jwks, {
        issuer: "https://appleid.apple.com",
        audience: IOS_BUNDLE_ID,
      }));
    } catch {
      throw new Error("Apple sign-in could not be verified");
    }
    if (payload["nonce"] !== (await sha256Hex(data.nonce))) throw new Error("Apple sign-in could not be verified");
    const email = typeof payload["email"] === "string" ? payload["email"].trim().toLowerCase() : "";
    const verified = payload["email_verified"] === true || payload["email_verified"] === "true";
    if (!email || !verified) throw new Error("Apple did not share a verified email");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (error || !tokenHash) throw new Error("Apple sign-in could not finish");
    return { tokenHash };
  });
