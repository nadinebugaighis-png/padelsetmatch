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
 * Contact-by-email helper. Opens the phone's mail app with the address filled in:
 * - native app: a top-level mailto: navigation is handed to the system by the
 *   Capacitor shell (iOS Mail / default mail app, Android email chooser);
 * - website in a normal tab: same-tab mailto: navigation;
 * - website inside a frame (previews, embeds): frames can't navigate to mailto:,
 *   so open it as a new window instead.
 * The address is also copied so the caller can show it as a fallback.
 */
export async function openMailTo(email: string, subject?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  let inFrame = false;
  try {
    inFrame = window.self !== window.top;
  } catch {
    inFrame = true;
  }
  if (!isNative() && inFrame) {
    window.open(url, "_blank");
  } else {
    window.location.href = url;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      /* clipboard blocked — the toast still shows the address */
    }
  }
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
/**
 * In the phone apps, links that open another site (Playtomic, Maps, WhatsApp…)
 * can be ignored by the app's web view, so players had to tap several times.
 * Catch every such tap once, app-wide, and open it in the in-app browser.
 */
let externalLinksHooked = false;
function hookExternalLinks() {
  if (externalLinksHooked || typeof document === "undefined") return;
  externalLinksHooked = true;
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      const external = url.host !== window.location.host;
      if (!external && a.target !== "_blank") return;
      e.preventDefault();
      void openExternal(url.toString());
    },
    true,
  );
}

export async function initNativeShell() {
  if (!isNative()) return;
  hookExternalLinks();
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

