import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform();

/** Native share sheet on iOS/Android, Web Share API / clipboard elsewhere. */
export async function nativeShare(opts: { title?: string; text?: string; url: string }) {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(opts.url);
    return false;
  }
  return false;
}

/** Ask iOS for push permission and return the APNs token (null if declined). */
export async function registerNativePush(): Promise<string | null> {
  if (!isNative()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;
  return await new Promise<string | null>((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10000);
    PushNotifications.addListener("registration", (token) => {
      clearTimeout(timeout);
      resolve(token.value);
    });
    PushNotifications.addListener("registrationError", () => {
      clearTimeout(timeout);
      resolve(null);
    });
    void PushNotifications.register();
  });
}

/** Status bar, splash screen and hardware back button. Safe no-op on the web. */
export async function initNativeShell() {
  if (!isNative()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
      import("@capacitor/app"),
    ]);
    await StatusBar.setStyle({ style: Style.Light });
    await SplashScreen.hide();
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.exitApp();
    });
  } catch {
    /* plugin missing in this build — ignore */
  }
}

/**
 * Native Sign in with Apple (iOS/iPadOS). Returns a discriminated result so the
 * caller can tell "user cancelled" apart from "plugin unavailable / failed" and
 * fall back to the web flow instead of silently doing nothing.
 */
interface AppleSignInPlugin {
  authorize(options: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
    nonce?: string;
  }): Promise<{ response?: { identityToken?: string } }>;
}

export type AppleSignInResult =
  | { status: "ok"; identityToken: string; nonce: string }
  | { status: "cancelled" }
  | { status: "unavailable"; message?: string };

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isCancellation(e: unknown) {
  const msg = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return msg.includes("cancel") || msg.includes("1001") || msg.includes("abort");
}

export async function nativeAppleSignIn(): Promise<AppleSignInResult> {
  if (!isNative() || nativePlatform() !== "ios") return { status: "unavailable" };
  // Use Capacitor's plugin registry instead of the package's JS wrapper:
  // the @capacitor-community/apple-sign-in web build touches `document` at
  // module scope, which crashes the server-side render. The native iOS
  // plugin is still shipped via `npx cap sync` and resolves by name here.
  const { registerPlugin, Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isPluginAvailable("SignInWithApple")) {
    return { status: "unavailable", message: "Sign in with Apple is not available in this build." };
  }
  const SignInWithApple = registerPlugin<AppleSignInPlugin>("SignInWithApple");
  // Apple must receive the SHA-256 hash of the nonce; Supabase receives the raw
  // value and hashes it again to compare against the identity-token claim.
  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);
  try {
    const result = await Promise.race([
      SignInWithApple.authorize({
        clientId: "com.moorisharches.padelsetmatch",
        redirectURI: "https://padelsetmatch.com/auth",
        scopes: "email name",
        nonce: hashedNonce,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Apple sign-in timed out")), 60_000),
      ),
    ]);
    const identityToken = result.response?.identityToken;
    if (!identityToken) return { status: "unavailable", message: "Apple did not return an identity token." };
    return { status: "ok", identityToken, nonce: rawNonce };
  } catch (e) {
    if (isCancellation(e)) return { status: "cancelled" };
    return { status: "unavailable", message: e instanceof Error ? e.message : String(e) };
  }
}

