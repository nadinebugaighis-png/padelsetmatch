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
 * Native Sign in with Apple (iOS only). Returns the Apple identity token,
 * or null if the user cancelled. Never available on web/Android.
 */
interface AppleSignInPlugin {
  authorize(options: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
    nonce?: string;
  }): Promise<{ response?: { identityToken?: string } }>;
}

export async function nativeAppleSignIn(): Promise<{ identityToken: string; nonce?: string } | null> {
  if (!isNative() || nativePlatform() !== "ios") return null;
  // Use Capacitor's plugin registry instead of the package's JS wrapper:
  // the @capacitor-community/apple-sign-in web build touches `document` at
  // module scope, which crashes the server-side render. The native iOS
  // plugin is still shipped via `npx cap sync` and resolves by name here.
  const { registerPlugin } = await import("@capacitor/core");
  const SignInWithApple = registerPlugin<AppleSignInPlugin>("SignInWithApple");
  // Supabase verifies the identity token signature; an unhashed nonce is fine here.
  const nonce = crypto.randomUUID();
  try {
    const result = await SignInWithApple.authorize({
      clientId: "com.moorisharches.padelsetmatch",
      redirectURI: "https://padelsetmatch.com/auth",
      scopes: "email name",
      nonce,
    });
    const identityToken = result.response?.identityToken;
    if (!identityToken) return null;
    return { identityToken, nonce };
  } catch {
    // user cancelled or capability missing
    return null;
  }
}
