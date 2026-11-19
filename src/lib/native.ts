import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform();

export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

function isShareCancel(e: unknown) {
  const name = (e as { name?: string } | null)?.name ?? "";
  const msg = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return name === "AbortError" || msg.includes("cancel") || msg.includes("abort");
}

/**
 * Native share sheet on iOS/Android, Web Share API, then clipboard. Never fails
 * silently: a missing plugin or a blocked browser share falls through to the
 * next option, and only a user cancel stops the chain.
 */
export async function nativeShare(opts: { title?: string; text?: string; url: string }): Promise<ShareOutcome> {
  if (isNative() && Capacitor.isPluginAvailable("Share")) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
      return "shared";
    } catch (e) {
      if (isShareCancel(e)) return "cancelled";
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return "shared";
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "AbortError") return "cancelled";
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(opts.text ? `${opts.text} ${opts.url}` : opts.url);
      return "copied";
    } catch {
      /* clipboard blocked */
    }
  }
  return "unavailable";
}

/**
 * Contact-by-email helper. On the web it opens the mail composer via mailto:.
 * In the native app the WebView swallows mailto: links, so instead it copies
 * the address to the clipboard and returns "copied" so the caller can tell
 * the user the address is ready to paste in their mail app.
 */
export async function openMailTo(email: string, subject?: string): Promise<"opened" | "copied"> {
  if (!isNative() && typeof window !== "undefined") {
    const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
    window.location.href = url;
    return "opened";
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      /* clipboard blocked — the toast still shows the address */
    }
  }
  return "copied";
}

/**
 * Open an external https link (e.g. wa.me) outside the app. In the native
 * WebView plain links are swallowed, so use the Capacitor Browser plugin;
 * on the web a normal new tab works.
 */
export async function openExternal(url: string): Promise<void> {
  if (isNative() && Capacitor.isPluginAvailable("Browser")) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch {
      /* fall through to window.open */
    }
  }
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
}

/** Ask iOS for push permission and return the APNs token (null if declined). */
export async function registerNativePush(): Promise<string | null> {
  if (!isNative()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;
  let finish: (value: string | null) => void = () => {};
  const result = new Promise<string | null>((resolve) => { finish = resolve; });
  const registration = await PushNotifications.addListener("registration", (token) => finish(token.value));
  const failure = await PushNotifications.addListener("registrationError", () => finish(null));
  const timeout = setTimeout(() => finish(null), 15000);
  try {
    await PushNotifications.register();
    return await result;
  } finally {
    clearTimeout(timeout);
    await Promise.all([registration.remove(), failure.remove()]);
  }
}

export async function listenForNativeNotificationTap(onTap: (path: string) => void) {
  if (!isNative()) return () => {};
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const { notificationPath } = await import("./notification-path");
  const handle = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const path = notificationPath(notification.data?.url);
    if (path) onTap(path);
  });
  return () => { void handle.remove(); };
}

/** Open trusted shared match links inside the already-running native shell. */
export async function listenForNativeMatchLink(onPath: (path: string) => void) {
  if (!isNative()) return () => {};
  const { App } = await import("@capacitor/app");
  const { resolveNativeMatchPath } = await import("./native-match-links");
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    void resolveNativeMatchPath(url).then((path) => {
      if (path) onPath(path);
    }).catch(() => {});
  });
  return () => { void handle.remove(); };
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
        setTimeout(() => reject(new Error("Apple sign-in timed out")), 30_000),
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

